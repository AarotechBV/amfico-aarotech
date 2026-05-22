import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminPulseModule } from './admin-pulse/admin-pulse.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { CoreModule } from './core/core.module';
import { OfficeModule } from './office/office.module';
import { OverviewModule } from './overview/overview.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    AdminPulseModule,
    AdminModule,
    OfficeModule,
    CompaniesModule,
    OverviewModule,
    // 120 req / minute / IP — generous for a logged-in user paging
    // through registrations, restrictive enough to blunt brute force
    // against the bearer-token validation path.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
