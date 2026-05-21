import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import {
  CreateUserDto,
  CredentialPayload,
  UpdateUserDto,
  UserSummary,
} from './dtos/user.dto';

const PAGE_SIZE = 50;

const generatePassword = (): string =>
  randomBytes(12).toString('base64url');

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async listUsers(): Promise<UserSummary[]> {
    const { data: users, error: usersErr } =
      await this.supabase.auth.admin.listUsers({ perPage: PAGE_SIZE });
    if (usersErr) {
      throw new InternalServerErrorException(usersErr.message);
    }
    const ids = users.users.map((u) => u.id);
    if (ids.length === 0) return [];

    const [profilesRes, keysRes] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .in('id', ids),
      this.supabase
        .from('admin_pulse_keys')
        .select('user_id, label, last_used_at')
        .in('user_id', ids),
    ]);
    if (profilesRes.error) {
      throw new InternalServerErrorException(profilesRes.error.message);
    }
    if (keysRes.error) {
      throw new InternalServerErrorException(keysRes.error.message);
    }
    const profileMap = new Map(profilesRes.data.map((p) => [p.id, p]));
    const keyMap = new Map(keysRes.data.map((k) => [k.user_id, k]));

    return users.users.map((u): UserSummary => {
      const profile = profileMap.get(u.id);
      const key = keyMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? '',
        fullName: profile?.full_name ?? null,
        role: (profile?.role as 'user' | 'admin') ?? 'user',
        isActive: profile?.is_active ?? false,
        hasApiKey: !!key,
        apiKeyLabel: key?.label ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        apiKeyLastUsedAt: key?.last_used_at ?? null,
        createdAt: u.created_at,
      };
    });
  }

  async createUser(dto: CreateUserDto): Promise<CredentialPayload> {
    const password = dto.password ?? generatePassword();
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password,
      email_confirm: true,
      user_metadata: dto.fullName ? { full_name: dto.fullName } : undefined,
    });
    if (error || !data.user) {
      throw new BadRequestException(error?.message ?? 'Could not create user');
    }
    // The profiles row was auto-created by the trigger with default role='user'.
    // Apply the requested role / full_name override.
    const updates: Record<string, unknown> = {};
    if (dto.role && dto.role !== 'user') updates['role'] = dto.role;
    if (dto.fullName) updates['full_name'] = dto.fullName;
    if (Object.keys(updates).length > 0) {
      const { error: pErr } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id);
      if (pErr) {
        throw new InternalServerErrorException(pErr.message);
      }
    }
    return { email: data.user.email ?? dto.email, password };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updates['full_name'] = dto.fullName;
    if (dto.role !== undefined) updates['role'] = dto.role;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;
    if (Object.keys(updates).length === 0) return;

    const { error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async resetPassword(
    id: string,
    password?: string,
  ): Promise<CredentialPayload> {
    const newPassword = password ?? generatePassword();
    const { data, error } = await this.supabase.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (error || !data.user) {
      throw new BadRequestException(error?.message ?? 'Could not reset password');
    }
    return { email: data.user.email ?? '', password: newPassword };
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.deleteUser(id);
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async assertExists(id: string): Promise<void> {
    const { data, error } = await this.supabase.auth.admin.getUserById(id);
    if (error || !data.user) {
      throw new NotFoundException('User not found');
    }
  }
}
