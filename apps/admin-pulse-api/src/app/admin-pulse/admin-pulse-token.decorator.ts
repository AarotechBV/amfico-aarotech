import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Reads the decrypted AdminPulse bearer token that AdminPulseAuthGuard
 * resolved from the authenticated user's stored API key.
 *
 *   getOverview(@AdminPulseToken() token: string) { ... }
 */
export const AdminPulseToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const token = request.authContext?.adminPulseToken;
    if (!token) {
      throw new Error(
        'AdminPulseToken decorator used without AdminPulseAuthGuard',
      );
    }
    return token;
  },
);
