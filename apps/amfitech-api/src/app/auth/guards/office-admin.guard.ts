import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Requires the authenticated user to be admin or super_admin AND for an
 * active office to be in scope (the user's own for admin/user; via
 * X-Active-Office header for super_admin).
 *
 * Use for office-scoped admin surfaces:
 *   @UseGuards(SupabaseAuthGuard, OfficeAdminGuard)
 */
@Injectable()
export class OfficeAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.authContext) {
      throw new Error('OfficeAdminGuard must run after SupabaseAuthGuard');
    }
    const { role, activeOfficeId } = request.authContext;
    if (role !== 'admin' && role !== 'super_admin') {
      throw new ForbiddenException('Admin or super admin role required');
    }
    if (!activeOfficeId) {
      throw new BadRequestException(
        'No active office in scope — set X-Active-Office header',
      );
    }
    return true;
  }
}
