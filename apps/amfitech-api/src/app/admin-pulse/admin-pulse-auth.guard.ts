import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthResolver } from '../auth/auth-resolver.service';

/**
 * Authenticates the request, resolves the active office, and loads +
 * decrypts that office's AdminPulse API key. Stamps the result onto
 * request.authContext for downstream controllers to read via
 * @AdminPulseToken().
 *
 * For admin/user the active office is their own profile.office_id.
 * For super_admin the active office must be supplied via the
 * X-Active-Office header (otherwise the request is rejected — there's
 * no sensible default key to use).
 */
@Injectable()
export class AdminPulseAuthGuard implements CanActivate {
  constructor(private readonly resolver: AuthResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.resolver.resolveSession(request);
    if (!session.activeOfficeId) {
      throw new BadRequestException(
        'No active office in scope — set X-Active-Office header',
      );
    }
    const adminPulseToken = await this.resolver.loadAdminPulseToken(
      session.activeOfficeId,
    );
    request.authContext = { ...session, adminPulseToken };
    return true;
  }
}
