import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { CryptoService } from './crypto.service';
import { SUPABASE_ADMIN } from './supabase.module';

const BEARER_PREFIX = 'Bearer ';
const ACTIVE_OFFICE_HEADER = 'x-active-office';

export type AppRole = 'user' | 'admin' | 'super_admin';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface SessionContext {
  userId: string;
  email: string;
  role: AppRole;
  /**
   * Office memberships from profile_offices. Empty for super_admin
   * (tenant-less; switches via X-Active-Office).
   */
  officeIds: string[];
  /**
   * The office to operate on. For admin/user it's the X-Active-Office
   * value (which must be one of officeIds) or, if absent, defaults to
   * the single office when officeIds.length === 1. For super_admin it's
   * the header value (or null when absent). Office-scoped endpoints
   * require this to be non-null.
   */
  activeOfficeId: string | null;
  /**
   * Decrypted AdminPulse API key for activeOfficeId. Only set by
   * AdminPulseAuthGuard.
   */
  adminPulseToken?: string;
}

declare module 'express' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request {
    authContext?: SessionContext;
  }
}

/**
 * Shared auth machinery. The guards call into this — keeps the
 * JWT-verification, profile-loading and office-resolution logic in one
 * place.
 */
@Injectable()
export class AuthResolver {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Verifies the bearer JWT and resolves session + active office.
   * Does NOT load the AdminPulse API key (`loadAdminPulseToken` does).
   */
  async resolveSession(request: Request): Promise<SessionContext> {
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }
    const accessToken = header.slice(BEARER_PREFIX.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('Empty bearer token');
    }

    const {
      data: { user },
      error: userErr,
    } = await this.supabase.auth.getUser(accessToken);
    if (userErr || !user) {
      throw new UnauthorizedException('Invalid Supabase access token');
    }

    const { data: profile, error: profileErr } = await this.supabase
      .from('profiles')
      .select('role_id, is_active')
      .eq('id', user.id)
      .single();
    if (profileErr || !profile) {
      throw new UnauthorizedException('No profile found for user');
    }
    if (!profile.is_active) {
      throw new ForbiddenException('User account is deactivated');
    }

    const role = profile.role_id as AppRole;

    let officeIds: string[] = [];
    if (role !== 'super_admin') {
      const { data: memberships, error: mErr } = await this.supabase
        .from('profile_offices')
        .select('office_id')
        .eq('user_id', user.id);
      if (mErr) {
        throw new UnauthorizedException('Could not load office memberships');
      }
      officeIds = (memberships ?? []).map((m) => m.office_id as string);
      if (officeIds.length === 0) {
        throw new ForbiddenException(
          'No offices assigned to this user. Contact an administrator.',
        );
      }
    }

    const requestedActiveOffice = this.#readActiveOfficeHeader(request);

    let activeOfficeId: string | null;
    if (role === 'super_admin') {
      // super_admin can switch to any office (or none for cross-office work)
      activeOfficeId = requestedActiveOffice;
    } else if (requestedActiveOffice) {
      if (!officeIds.includes(requestedActiveOffice)) {
        throw new ForbiddenException(
          'Cannot act on an office you are not a member of',
        );
      }
      activeOfficeId = requestedActiveOffice;
    } else if (officeIds.length === 1) {
      // Single-office users get their one office implicitly
      activeOfficeId = officeIds[0];
    } else {
      // Multi-office user without an explicit header: the frontend must
      // pick one before hitting office-scoped endpoints. Endpoints that
      // need it will fail via OfficeAdminGuard / AdminPulseAuthGuard.
      activeOfficeId = null;
    }

    return {
      userId: user.id,
      email: user.email ?? '',
      role,
      officeIds,
      activeOfficeId,
    };
  }

  /**
   * Loads + decrypts the AdminPulse API key for the active office.
   * Throws if the office is missing, has no key, or decryption fails.
   */
  async loadAdminPulseToken(activeOfficeId: string): Promise<string> {
    const { data: keyRow, error } = await this.supabase
      .from('admin_pulse_keys')
      .select('id, encrypted_key')
      .eq('office_id', activeOfficeId)
      .maybeSingle();
    if (error) {
      throw new UnauthorizedException('Could not load AdminPulse key');
    }
    if (!keyRow) {
      throw new ForbiddenException(
        'No AdminPulse API key linked to this office. Ask an administrator to set it.',
      );
    }
    try {
      const token = this.crypto.decrypt(keyRow.encrypted_key);
      void this.supabase
        .from('admin_pulse_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRow.id);
      return token;
    } catch {
      throw new ForbiddenException(
        'Stored AdminPulse key could not be decrypted. Contact an administrator.',
      );
    }
  }

  #readActiveOfficeHeader(request: Request): string | null {
    const raw = request.headers[ACTIVE_OFFICE_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return null;
    if (!UUID_RE.test(value)) {
      throw new BadRequestException(
        `Invalid ${ACTIVE_OFFICE_HEADER} header (must be a UUID)`,
      );
    }
    return value;
  }
}
