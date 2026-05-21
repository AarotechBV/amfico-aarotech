import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Requires the request's authContext (set by SupabaseAuthGuard) to have
 * role === 'admin'. Use as the second guard:
 *
 *   @UseGuards(SupabaseAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.authContext) {
      throw new Error('AdminGuard must run after SupabaseAuthGuard');
    }
    if (request.authContext.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }
}
