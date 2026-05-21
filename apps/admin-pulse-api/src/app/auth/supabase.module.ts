import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_ADMIN = 'SUPABASE_ADMIN';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient => {
        const url = config.getOrThrow<string>('SUPABASE_URL');
        const serviceRoleKey = config.getOrThrow<string>(
          'SUPABASE_SERVICE_ROLE_KEY',
        );
        // Admin client: uses the service_role key, bypasses RLS.
        // Never exposed to controllers that handle untrusted input.
        return createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
