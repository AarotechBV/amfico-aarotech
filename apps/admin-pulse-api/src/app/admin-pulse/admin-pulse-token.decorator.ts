import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Reads the AdminPulse bearer token that AdminPulseAuthGuard already
 * extracted from the request. Use on controller methods that need to make
 * upstream calls:
 *
 *   getOverview(@AdminPulseToken() token: string) { ... }
 */
export const AdminPulseToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { adminPulseToken?: string }>();
    if (!request.adminPulseToken) {
      throw new Error(
        'AdminPulseToken decorator used without AdminPulseAuthGuard',
      );
    }
    return request.adminPulseToken;
  },
);
