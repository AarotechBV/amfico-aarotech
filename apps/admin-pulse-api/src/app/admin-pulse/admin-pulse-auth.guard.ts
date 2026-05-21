import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

const BEARER_PREFIX = 'Bearer ';

/**
 * Extracts the AdminPulse bearer token from the incoming Authorization header
 * and attaches it as `request.adminPulseToken` so controllers and services
 * can read it without parsing the header themselves.
 *
 * Today this is pass-through (frontend sends the token). When we move to
 * OAuth, this is the only file that has to change — the token can come from
 * a session, a cookie, or a token exchange.
 */
@Injectable()
export class AdminPulseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { adminPulseToken?: string }>();
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      throw new UnauthorizedException('Empty bearer token');
    }
    request.adminPulseToken = token;
    return true;
  }
}
