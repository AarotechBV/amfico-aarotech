import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import {
  AppRole,
  buildFullName,
  CreateUserDto,
  CredentialPayload,
  UpdateUserDto,
  UserOfficeRef,
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

    const [profilesRes, membershipsRes] = await Promise.all([
      this.supabase
        .from('profiles')
        .select('id, first_name, last_name, role_id, is_active')
        .in('id', ids),
      this.supabase
        .from('profile_offices')
        .select('user_id, office_id, offices(name)')
        .in('user_id', ids),
    ]);

    if (profilesRes.error) {
      throw new InternalServerErrorException(profilesRes.error.message);
    }
    if (membershipsRes.error) {
      throw new InternalServerErrorException(membershipsRes.error.message);
    }

    const officesByUser = new Map<string, UserOfficeRef[]>();
    for (const row of membershipsRes.data ?? []) {
      const uid = row.user_id as string;
      const office = (row as unknown as { offices?: { name: string } | null })
        .offices;
      if (!officesByUser.has(uid)) officesByUser.set(uid, []);
      officesByUser.get(uid)!.push({
        id: row.office_id as string,
        name: office?.name ?? '',
      });
    }

    const profileMap = new Map(profilesRes.data.map((p) => [p.id, p]));
    const result: UserSummary[] = [];
    for (const u of users.users) {
      const profile = profileMap.get(u.id);
      if (!profile) continue;
      const offices = officesByUser.get(u.id) ?? [];
      if (filters.officeId !== undefined) {
        if (!offices.some((o) => o.id === filters.officeId)) continue;
      }
      const firstName = (profile.first_name as string | null) ?? null;
      const lastName = (profile.last_name as string | null) ?? null;
      result.push({
        id: u.id,
        email: u.email ?? '',
        firstName,
        lastName,
        fullName: buildFullName(firstName, lastName),
        role: profile.role_id as AppRole,
        offices,
        isActive: profile.is_active as boolean,
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at,
      });
    }
    return result;
  }

  async createUser(dto: CreateUserDto): Promise<CredentialPayload> {
    const officeIds = this.#normalizeOfficeIds(dto.role, dto.officeIds);

    const password = dto.password ?? generatePassword();

    // The handle_new_user trigger creates the profile row from
    // user_metadata (first_name + last_name + role_id). Memberships
    // are inserted separately below.
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: dto.firstName,
        last_name: dto.lastName ?? null,
        role_id: dto.role,
      },
    });
    if (error || !data.user) {
      if (error && this.#isDuplicateEmailError(error)) {
        throw new ConflictException(
          'Er bestaat al een gebruiker met dit e-mailadres.',
        );
      }
      throw new BadRequestException(error?.message ?? 'Could not create user');
    }

    if (officeIds.length > 0) {
      const { error: mErr } = await this.supabase
        .from('profile_offices')
        .insert(
          officeIds.map((office_id) => ({ user_id: data.user!.id, office_id })),
        );
      if (mErr) {
        // Roll back the auth user so we don't leave a half-created one
        await this.supabase.auth.admin.deleteUser(data.user.id);
        throw new BadRequestException(mErr.message);
      }
    }

    return { email: data.user.email ?? dto.email, password };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<void> {
    const current = await this.#getProfile(id);

    const nextRole: AppRole =
      (dto.role as AppRole | undefined) ?? current.role_id;

    // Anti-lockout: refuse to demote/deactivate the last active super_admin
    if (
      current.role_id === 'super_admin' &&
      (nextRole !== 'super_admin' || dto.isActive === false)
    ) {
      await this.#assertAnotherActiveSuperAdminExists(id);
    }

    // ---------- profile column updates ----------
    const updates: Record<string, unknown> = {};
    if (dto.firstName !== undefined) updates['first_name'] = dto.firstName;
    if (dto.lastName !== undefined) updates['last_name'] = dto.lastName;
    if (dto.role !== undefined) updates['role_id'] = dto.role;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;
    if (Object.keys(updates).length > 0) {
      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);
      if (error) {
        throw new InternalServerErrorException(error.message);
      }
    }

    // ---------- office membership sync ----------
    // If role is changing to super_admin, wipe memberships unconditionally.
    // Otherwise, if officeIds was provided, replace memberships with it.
    const becomingSuperAdmin =
      dto.role === 'super_admin' && current.role_id !== 'super_admin';

    if (becomingSuperAdmin) {
      const { error } = await this.supabase
        .from('profile_offices')
        .delete()
        .eq('user_id', id);
      if (error) throw new InternalServerErrorException(error.message);
    } else if (dto.officeIds !== undefined) {
      const desired = this.#normalizeOfficeIds(nextRole, dto.officeIds);
      await this.#syncMemberships(id, desired);
    } else if (nextRole !== 'super_admin') {
      // Role changed but officeIds wasn't provided — make sure they still
      // have ≥ 1 membership.
      const { count, error } = await this.supabase
        .from('profile_offices')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', id);
      if (error) throw new InternalServerErrorException(error.message);
      if ((count ?? 0) === 0) {
        throw new BadRequestException(
          `${nextRole} must belong to at least one office`,
        );
      }
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

  /**
   * Office-scoped delete: removes the user's membership in `officeId`.
   * If that was the last membership, deletes the auth user entirely.
   * Used by the office-admin surface.
   */
  async removeUserFromOffice(id: string, officeId: string): Promise<void> {
    const profile = await this.#getProfile(id);
    if (profile.role_id === 'super_admin') {
      throw new ForbiddenException(
        'Super admins are not bound to offices and cannot be removed this way',
      );
    }

    const { data: memberships, error: mErr } = await this.supabase
      .from('profile_offices')
      .select('office_id')
      .eq('user_id', id);
    if (mErr) throw new InternalServerErrorException(mErr.message);
    const offices = (memberships ?? []).map((m) => m.office_id as string);

    if (!offices.includes(officeId)) {
      throw new NotFoundException('User is not a member of this office');
    }

    if (offices.length === 1) {
      // Last office — remove the whole user (cascade deletes the membership)
      const { error } = await this.supabase.auth.admin.deleteUser(id);
      if (error) throw new BadRequestException(error.message);
      return;
    }

    const { error } = await this.supabase
      .from('profile_offices')
      .delete()
      .eq('user_id', id)
      .eq('office_id', officeId);
    if (error) throw new InternalServerErrorException(error.message);
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
    const { data, error } = await this.supabase
      .from('profile_offices')
      .select('user_id')
      .eq('user_id', id)
      .eq('office_id', officeId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) {
      throw new ForbiddenException(
        'This user does not belong to your active office',
      );
    }
  }

  // ---------- internals ----------

  /**
   * GoTrue returns different shapes for the duplicate-email case
   * depending on version: a structured `code: 'email_exists'` on newer
   * builds, or a generic 422 with a message containing "already" on
   * older ones. Cover both.
   */
  #isDuplicateEmailError(error: AuthError | { message?: string; code?: string; status?: number }): boolean {
    const code = (error as { code?: string }).code;
    if (code === 'email_exists' || code === 'user_already_exists') return true;
    const status = (error as { status?: number }).status;
    const message = (error.message ?? '').toLowerCase();
    if (status === 422 && message.includes('already')) return true;
    return message.includes('already registered') || message.includes('already been registered');
  }

  #normalizeOfficeIds(role: AppRole, officeIds?: string[]): string[] {
    if (role === 'super_admin') {
      if (officeIds && officeIds.length > 0) {
        throw new BadRequestException(
          'super_admin must have no office memberships',
        );
      }
      return [];
    }
    if (!officeIds || officeIds.length === 0) {
      throw new BadRequestException(
        `${role} must belong to at least one office`,
      );
    }
    return [...new Set(officeIds)];
  }

  async #syncMemberships(userId: string, desired: string[]): Promise<void> {
    const { data: existing, error: readErr } = await this.supabase
      .from('profile_offices')
      .select('office_id')
      .eq('user_id', userId);
    if (readErr) throw new InternalServerErrorException(readErr.message);

    const current = new Set((existing ?? []).map((m) => m.office_id as string));
    const wanted = new Set(desired);

    const toAdd = [...wanted].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !wanted.has(id));

    if (toAdd.length > 0) {
      const { error } = await this.supabase
        .from('profile_offices')
        .insert(toAdd.map((office_id) => ({ user_id: userId, office_id })));
      if (error) throw new InternalServerErrorException(error.message);
    }
    if (toRemove.length > 0) {
      const { error } = await this.supabase
        .from('profile_offices')
        .delete()
        .eq('user_id', userId)
        .in('office_id', toRemove);
      if (error) throw new InternalServerErrorException(error.message);
    }
  }

  async #getProfile(id: string): Promise<{
    id: string;
    role_id: AppRole;
    is_active: boolean;
  }> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, role_id, is_active')
      .eq('id', id)
      .single();
    if (error || !data) {
      throw new NotFoundException('User not found');
    }
    return data as {
      id: string;
      role_id: AppRole;
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
