import {
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

export type AuthRole = 'user' | 'admin';

export interface AuthedRequestContext {
  userId: string;
  email: string;
  role: AuthRole;
  /** Only set on requests that went through AdminPulseAuthGuard */
  adminPulseToken?: string;
}

declare module 'express' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request {
    authContext?: AuthedRequestContext;
  }
}

/**
 * Shared auth machinery. The two guards (SupabaseAuthGuard,
 * AdminPulseAuthGuard) both call into this — keeps the JWT-verification
 * and profile-loading logic in one place.
 */
@Injectable()
export class AuthResolver {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Verifies the Authorization bearer is a valid Supabase JWT and the
   * matching profile is active. Returns the base context; does NOT load
   * the AdminPulse API key (use `loadAdminPulseToken` for that).
   */
  async resolveSession(request: Request): Promise<AuthedRequestContext> {
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
      .select('role, is_active')
      .eq('id', user.id)
      .single();
    if (profileErr || !profile) {
      throw new UnauthorizedException('No profile found for user');
    }
    if (!profile.is_active) {
      throw new ForbiddenException('User account is deactivated');
    }

    return {
      userId: user.id,
      email: user.email ?? '',
      role: profile.role as AuthRole,
    };
  }

  /**
   * Loads + decrypts the AdminPulse API key linked to a user. Throws
   * ForbiddenException if no key is linked or decryption fails.
   */
  async loadAdminPulseToken(userId: string): Promise<string> {
    const { data: keyRow, error: keyErr } = await this.supabase
      .from('admin_pulse_keys')
      .select('id, encrypted_key')
      .eq('user_id', userId)
      .maybeSingle();
    if (keyErr) {
      throw new UnauthorizedException('Could not load AdminPulse key');
    }
    if (!keyRow) {
      throw new ForbiddenException(
        'No AdminPulse API key linked to this account. Contact your administrator.',
      );
    }
    try {
      const token = this.crypto.decrypt(keyRow.encrypted_key);
      // Fire-and-forget last_used_at stamp
      void this.supabase
        .from('admin_pulse_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRow.id);
      return token;
    } catch {
      throw new ForbiddenException(
        'Stored AdminPulse key could not be decrypted. Contact your administrator.',
      );
    }
  }
}
