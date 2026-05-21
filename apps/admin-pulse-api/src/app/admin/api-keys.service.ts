import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CryptoService } from '../auth/crypto.service';
import { SUPABASE_ADMIN } from '../auth/supabase.module';
import { ApiKeyMetadata, SetApiKeyDto } from './dtos/api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly crypto: CryptoService,
  ) {}

  async getMetadata(userId: string): Promise<ApiKeyMetadata> {
    const { data, error } = await this.supabase
      .from('admin_pulse_keys')
      .select('label, last_used_at, created_at, updated_at')
      .eq('user_id', userId)
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

  async upsertKey(userId: string, dto: SetApiKeyDto): Promise<ApiKeyMetadata> {
    const encrypted = this.crypto.encrypt(dto.key.trim());
    const payload = {
      user_id: userId,
      encrypted_key: encrypted,
      label: dto.label ?? null,
    };
    const { error } = await this.supabase
      .from('admin_pulse_keys')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return this.getMetadata(userId);
  }

  async deleteKey(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_pulse_keys')
      .delete()
      .eq('user_id', userId);
    if (error) {
      throw new NotFoundException(error.message);
    }
  }
}
