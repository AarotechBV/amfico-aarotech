import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { PriceListItemsHierarchyDto } from '@amfico@aarotech/admin-pulse-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { ADMIN_PULSE_SLOW_CACHE_TTL_MS } from '../admin-pulse.constants';

@Injectable()
export class HierarchyClient {
  constructor(
    private readonly http: AdminPulseHttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async list(token: string): Promise<PriceListItemsHierarchyDto> {
    const key = `hierarchy:${token}`;
    const cached = await this.cache.get<PriceListItemsHierarchyDto>(key);
    if (cached) return cached;
    const data = await this.http.get<PriceListItemsHierarchyDto>(
      '/registrations/pricelistitems/tree',
      token,
    );
    await this.cache.set(key, data, ADMIN_PULSE_SLOW_CACHE_TTL_MS);
    return data;
  }
}
