import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthResolver } from '../auth-resolver.service';

/**
 * Validates the Supabase JWT and loads the user's profile. Use on
 * endpoints that need an authenticated user but don't need to call
 * AdminPulse upstream (e.g. admin/back-office endpoints).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly resolver: AuthResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    request.authContext = await this.resolver.resolveSession(request);
    return true;
  }
}
