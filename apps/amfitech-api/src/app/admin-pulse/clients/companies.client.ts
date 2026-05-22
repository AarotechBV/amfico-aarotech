import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { CompanyDto } from '@amfico@aarotech/amfitech-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { ADMIN_PULSE_SLOW_CACHE_TTL_MS } from '../admin-pulse.constants';

@Injectable()
export class CompaniesClient {
  constructor(
    private readonly http: AdminPulseHttpService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async listAll(token: string): Promise<CompanyDto[]> {
    const key = `companies:${token}`;
    const cached = await this.cache.get<CompanyDto[]>(key);
    if (cached) return cached;
    const data = await this.http.get<CompanyDto[]>('/companies', token);
    await this.cache.set(key, data, ADMIN_PULSE_SLOW_CACHE_TTL_MS);
    return data;
  }
}
