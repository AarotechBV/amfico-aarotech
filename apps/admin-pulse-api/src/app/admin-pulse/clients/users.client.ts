import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PageDto, UserDto } from '@amfico@aarotech/admin-pulse-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { fetchAllPages } from '../admin-pulse-paginate.util';
import { ADMIN_PULSE_SLOW_CACHE_TTL_MS } from '../admin-pulse.constants';

@Injectable()
export class UsersClient {
  constructor(
    private readonly http: AdminPulseHttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listAll(token: string): Promise<UserDto[]> {
    const key = `users:${token}`;
    const cached = await this.cache.get<UserDto[]>(key);
    if (cached) return cached;
    const data = await fetchAllPages((page, pageSize) =>
      this.http.get<PageDto<UserDto>>('/users', token, { page, pageSize }),
    );
    await this.cache.set(key, data, ADMIN_PULSE_SLOW_CACHE_TTL_MS);
    return data;
  }
}
