import { Module } from '@nestjs/common';
import { AdminPulseModule } from './admin-pulse/admin-pulse.module';
import { CompaniesModule } from './companies/companies.module';
import { CoreModule } from './core/core.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [CoreModule, AdminPulseModule, CompaniesModule, OverviewModule],
})
export class AppModule {}
