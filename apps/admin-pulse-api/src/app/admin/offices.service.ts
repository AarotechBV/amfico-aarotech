import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { OfficeApiKeyService } from '../office/office-api-key.service';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import {
  CreateOfficeDto,
  OfficeSummary,
  UpdateOfficeDto,
} from './dtos/office.dto';

interface OfficeRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

@Injectable()
export class OfficesService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly apiKeys: OfficeApiKeyService,
  ) {}

  async listOffices(): Promise<OfficeSummary[]> {
    const [offices, memberships, keys] = await Promise.all([
      this.supabase
        .from('offices')
        .select('id, name, is_active, created_at')
        .order('name'),
      this.supabase.from('profile_offices').select('office_id'),
      this.supabase
        .from('admin_pulse_keys')
        .select('office_id, last_used_at'),
    ]);

    if (offices.error)
      throw new InternalServerErrorException(offices.error.message);
    if (memberships.error)
      throw new InternalServerErrorException(memberships.error.message);
    if (keys.error)
      throw new InternalServerErrorException(keys.error.message);

    const counts = new Map<string, number>();
    for (const m of memberships.data) {
      counts.set(m.office_id, (counts.get(m.office_id) ?? 0) + 1);
    }
    const keyMap = new Map(keys.data.map((k) => [k.office_id, k]));

    return (offices.data as OfficeRow[]).map((o) => {
      const k = keyMap.get(o.id);
      return {
        id: o.id,
        name: o.name,
        isActive: o.is_active,
        userCount: counts.get(o.id) ?? 0,
        hasApiKey: !!k,
        apiKeyLastUsedAt: k?.last_used_at ?? null,
        createdAt: o.created_at,
      };
    });
  }

  async createOffice(dto: CreateOfficeDto): Promise<OfficeSummary> {
    const { data, error } = await this.supabase
      .from('offices')
      .insert({ name: dto.name })
      .select('id, name, is_active, created_at')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Could not create office');
    }

    let keyMetadata;
    try {
      keyMetadata = await this.apiKeys.upsertKey(data.id, {
        key: dto.apiKey,
      });
    } catch (err) {
      // Roll back the office so we don't leave a key-less stub
      await this.supabase.from('offices').delete().eq('id', data.id);
      throw err;
    }

    return {
      id: data.id,
      name: data.name,
      isActive: data.is_active,
      userCount: 0,
      hasApiKey: keyMetadata.hasKey,
      apiKeyLastUsedAt: keyMetadata.lastUsedAt,
      createdAt: data.created_at,
    };
  }

  async updateOffice(id: string, dto: UpdateOfficeDto): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;
    if (Object.keys(updates).length === 0) return;
    const { error } = await this.supabase
      .from('offices')
      .update(updates)
      .eq('id', id);
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteOffice(id: string): Promise<void> {
    // Refuse if any user is still a member of this office
    const { count, error: countErr } = await this.supabase
      .from('profile_offices')
      .select('user_id', { count: 'exact', head: true })
      .eq('office_id', id);
    if (countErr) throw new InternalServerErrorException(countErr.message);
    if ((count ?? 0) > 0) {
      throw new BadRequestException(
        'Cannot delete an office that still has users assigned. Move them first.',
      );
    }
    const { error } = await this.supabase.from('offices').delete().eq('id', id);
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async assertExists(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('offices')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Office not found');
  }
}
