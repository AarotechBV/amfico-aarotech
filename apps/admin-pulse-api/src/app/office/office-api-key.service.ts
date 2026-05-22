import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CryptoService } from '../auth/crypto.service';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import {
  OfficeApiKeyMetadata,
  SetOfficeApiKeyDto,
} from './dtos/office-api-key.dto';

@Injectable()
export class OfficeApiKeyService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly crypto: CryptoService,
  ) {}

  async getMetadata(officeId: string): Promise<OfficeApiKeyMetadata> {
    const { data, error } = await this.supabase
      .from('admin_pulse_keys')
      .select('label, last_used_at, created_at, updated_at')
      .eq('office_id', officeId)
      .maybeSingle();
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
      return {
        hasKey: false,
        label: null,
        lastUsedAt: null,
        createdAt: null,
        updatedAt: null,
      };
    }
    return {
      hasKey: true,
      label: data.label,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async upsertKey(
    officeId: string,
    dto: SetOfficeApiKeyDto,
  ): Promise<OfficeApiKeyMetadata> {
    const encrypted = this.crypto.encrypt(dto.key.trim());
    const { error } = await this.supabase
      .from('admin_pulse_keys')
      .upsert(
        {
          office_id: officeId,
          encrypted_key: encrypted,
          label: dto.label ?? null,
        },
        { onConflict: 'office_id' },
      );
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.getMetadata(officeId);
  }

  async deleteKey(officeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_pulse_keys')
      .delete()
      .eq('office_id', officeId);
    if (error) {
      throw new NotFoundException(error.message);
    }
  }
}
