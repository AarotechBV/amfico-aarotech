import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthResolver } from '../auth/auth-resolver.service';

/**
 * Authenticates a request AND resolves the user's AdminPulse API key.
 * Use on endpoints that proxy AdminPulse calls. The decrypted key is
 * stamped onto request.authContext.adminPulseToken — read it via the
 * @AdminPulseToken() decorator.
 *
 * This is the single seam between "how users log in" and "what we pass
 * upstream to AdminPulse". Swapping to OAuth later only changes
 * AuthResolver.
 */
@Injectable()
export class AdminPulseAuthGuard implements CanActivate {
  constructor(private readonly resolver: AuthResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.resolver.resolveSession(request);
    const adminPulseToken = await this.resolver.loadAdminPulseToken(
      session.userId,
    );
    request.authContext = { ...session, adminPulseToken };
    return true;
  }
}
