import { Module } from '@nestjs/common';
import { AdminPulseModule } from './admin-pulse/admin-pulse.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CoreModule } from './core/core.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    AdminPulseModule,
    AdminModule,
    CompaniesModule,
    OverviewModule,
  ],
})
export class AppModule {}
