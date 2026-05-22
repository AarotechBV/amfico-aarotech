import { Global, Module } from '@nestjs/common';
import { AuthResolver } from './auth-resolver.service';
import { CryptoService } from './crypto.service';
import { OfficeAdminGuard } from './guards/office-admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { MeController } from './me.controller';
import { SupabaseModule } from './supabase.module';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [MeController],
  providers: [
    CryptoService,
    AuthResolver,
    SupabaseAuthGuard,
    OfficeAdminGuard,
    SuperAdminGuard,
  ],
  exports: [
    SupabaseModule,
    CryptoService,
    AuthResolver,
    SupabaseAuthGuard,
    OfficeAdminGuard,
    SuperAdminGuard,
  ],
})
export class AuthModule {}
