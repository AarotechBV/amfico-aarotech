import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
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
  ) {}

  async listOffices(): Promise<OfficeSummary[]> {
    const [offices, profiles, keys] = await Promise.all([
      this.supabase
        .from('offices')
        .select('id, name, is_active, created_at')
        .order('name'),
      this.supabase.from('profiles').select('office_id'),
      this.supabase
        .from('admin_pulse_keys')
        .select('office_id, label, last_used_at'),
    ]);

    if (offices.error)
      throw new InternalServerErrorException(offices.error.message);
    if (profiles.error)
      throw new InternalServerErrorException(profiles.error.message);
    if (keys.error)
      throw new InternalServerErrorException(keys.error.message);

    const counts = new Map<string, number>();
    for (const p of profiles.data) {
      if (!p.office_id) continue;
      counts.set(p.office_id, (counts.get(p.office_id) ?? 0) + 1);
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
        apiKeyLabel: k?.label ?? null,
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
    return {
      id: data.id,
      name: data.name,
      isActive: data.is_active,
      userCount: 0,
      hasApiKey: false,
      apiKeyLabel: null,
      apiKeyLastUsedAt: null,
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
    // Refuse if any user still belongs to this office
    const { count, error: countErr } = await this.supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
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
