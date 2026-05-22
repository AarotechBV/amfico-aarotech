import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import {
  AppRole,
  CreateUserDto,
  CredentialPayload,
  UpdateUserDto,
  UserSummary,
} from './dtos/user.dto';

const PAGE_SIZE = 100;

const generatePassword = (): string => randomBytes(12).toString('base64url');

interface ListFilters {
  officeId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async listUsers(filters: ListFilters = {}): Promise<UserSummary[]> {
    const { data: users, error: usersErr } =
      await this.supabase.auth.admin.listUsers({ perPage: PAGE_SIZE });
    if (usersErr) {
      throw new InternalServerErrorException(usersErr.message);
    }
    const ids = users.users.map((u) => u.id);
    if (ids.length === 0) return [];

    let profilesQuery = this.supabase
      .from('profiles')
      .select('id, full_name, role_id, office_id, is_active, offices(name)')
      .in('id', ids);

    if (filters.officeId !== undefined) {
      profilesQuery = profilesQuery.eq('office_id', filters.officeId);
    }

    const { data: profiles, error: profileErr } = await profilesQuery;
    if (profileErr) {
      throw new InternalServerErrorException(profileErr.message);
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));
    const result: UserSummary[] = [];
    for (const u of users.users) {
      const profile = profileMap.get(u.id);
      if (!profile) continue;
      const office = (
        profile as unknown as { offices?: { name: string } | null }
      ).offices;
      result.push({
        id: u.id,
        email: u.email ?? '',
        fullName: profile.full_name ?? null,
        role: profile.role_id as AppRole,
        officeId: profile.office_id as string | null,
        officeName: office?.name ?? null,
        isActive: profile.is_active as boolean,
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at,
      });
    }
    return result;
  }

  async createUser(dto: CreateUserDto): Promise<CredentialPayload> {
    this.#validateRoleOfficeConsistency(dto.role, dto.officeId ?? null);

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

    // Profile row was auto-created by the on_auth_user_created trigger
    // with default role_id='user' and office_id=null. Apply the requested
    // values (the DB check constraint also enforces consistency).
    const updates: Record<string, unknown> = {
      role_id: dto.role,
      office_id: dto.role === 'super_admin' ? null : (dto.officeId ?? null),
    };
    if (dto.fullName) updates['full_name'] = dto.fullName;

    const { error: pErr } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', data.user.id);
    if (pErr) {
      // Roll back the auth user so we don't leave a dangling row
      await this.supabase.auth.admin.deleteUser(data.user.id);
      throw new BadRequestException(pErr.message);
    }

    return { email: data.user.email ?? dto.email, password };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<void> {
    const current = await this.#getProfile(id);

    const nextRole: AppRole =
      (dto.role as AppRole | undefined) ?? current.role_id;
    const nextOffice: string | null =
      dto.officeId !== undefined ? dto.officeId : current.office_id;

    if (nextRole === 'super_admin' && nextOffice !== null) {
      throw new BadRequestException('super_admin must have officeId null');
    }
    if (nextRole !== 'super_admin' && nextOffice === null) {
      throw new BadRequestException(`${nextRole} must have an officeId`);
    }

    // Anti-lockout: refuse to demote/deactivate the last active super_admin
    if (
      current.role_id === 'super_admin' &&
      (nextRole !== 'super_admin' || dto.isActive === false)
    ) {
      await this.#assertAnotherActiveSuperAdminExists(id);
    }

    const updates: Record<string, unknown> = {};
    if (dto.fullName !== undefined) updates['full_name'] = dto.fullName;
    if (dto.role !== undefined) updates['role_id'] = dto.role;
    if (dto.officeId !== undefined) updates['office_id'] = dto.officeId;
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
      throw new BadRequestException(
        error?.message ?? 'Could not reset password',
      );
    }
    return { email: data.user.email ?? '', password: newPassword };
  }

  async deleteUser(id: string): Promise<void> {
    const profile = await this.#getProfile(id);
    if (profile.role_id === 'super_admin') {
      await this.#assertAnotherActiveSuperAdminExists(id);
    }
    const { error } = await this.supabase.auth.admin.deleteUser(id);
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  /** Throws NotFoundException if the user doesn't exist in auth. */
  async assertExists(id: string): Promise<void> {
    const { data, error } = await this.supabase.auth.admin.getUserById(id);
    if (error || !data.user) {
      throw new NotFoundException('User not found');
    }
  }

  /** Throws ForbiddenException if the target user isn't in `officeId`. */
  async assertBelongsToOffice(id: string, officeId: string): Promise<void> {
    const profile = await this.#getProfile(id);
    if (profile.office_id !== officeId) {
      throw new ForbiddenException(
        'This user does not belong to your active office',
      );
    }
  }

  // ---------- internals ----------

  #validateRoleOfficeConsistency(role: AppRole, officeId: string | null) {
    if (role === 'super_admin' && officeId !== null) {
      throw new BadRequestException('super_admin must have officeId null');
    }
    if (role !== 'super_admin' && !officeId) {
      throw new BadRequestException(`${role} must have an officeId`);
    }
  }

  async #getProfile(id: string): Promise<{
    id: string;
    role_id: AppRole;
    office_id: string | null;
    is_active: boolean;
  }> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, role_id, office_id, is_active')
      .eq('id', id)
      .single();
    if (error || !data) {
      throw new NotFoundException('User not found');
    }
    return data as {
      id: string;
      role_id: AppRole;
      office_id: string | null;
      is_active: boolean;
    };
  }

  async #assertAnotherActiveSuperAdminExists(excludeId: string): Promise<void> {
    const { count, error } = await this.supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', 'super_admin')
      .eq('is_active', true)
      .neq('id', excludeId);
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if ((count ?? 0) === 0) {
      throw new ForbiddenException(
        'Refusing to remove the last active super admin',
      );
    }
  }
}
