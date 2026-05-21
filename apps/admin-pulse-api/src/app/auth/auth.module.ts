import { Global, Module } from '@nestjs/common';
import { AuthResolver } from './auth-resolver.service';
import { CryptoService } from './crypto.service';
import { AdminGuard } from './guards/admin.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { MeController } from './me.controller';
import { SupabaseModule } from './supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [MeController],
  providers: [CryptoService, AuthResolver, SupabaseAuthGuard, AdminGuard],
  exports: [
    SupabaseModule,
    CryptoService,
    AuthResolver,
    SupabaseAuthGuard,
    AdminGuard,
  ],
})
export class AuthModule {}
