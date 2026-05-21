import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PageDto, RelationDto } from '@amfico@aarotech/admin-pulse-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { fetchAllPages } from '../admin-pulse-paginate.util';
import { ADMIN_PULSE_SLOW_CACHE_TTL_MS } from '../admin-pulse.constants';

@Injectable()
export class RelationsClient {
  constructor(
    private readonly http: AdminPulseHttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listAll(token: string): Promise<RelationDto[]> {
    const key = `relations:${token}`;
    const cached = await this.cache.get<RelationDto[]>(key);
    if (cached) return cached;
    const data = await fetchAllPages((page, pageSize) =>
      this.http.get<PageDto<RelationDto>>('/relations', token, {
        page,
        pageSize,
      }),
    );
    await this.cache.set(key, data, ADMIN_PULSE_SLOW_CACHE_TTL_MS);
    return data;
  }
}
