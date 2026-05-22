import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Requires the authenticated user's role to be 'super_admin'. Must run
 * after SupabaseAuthGuard so that request.authContext is populated:
 *
 *   @UseGuards(SupabaseAuthGuard, SuperAdminGuard)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.authContext) {
      throw new Error('SuperAdminGuard must run after SupabaseAuthGuard');
    }
    if (request.authContext.role !== 'super_admin') {
      throw new ForbiddenException('Super admin role required');
    }
    return true;
  }
}
