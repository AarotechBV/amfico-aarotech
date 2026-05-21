import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminPulseAuthGuard } from './admin-pulse-auth.guard';
import { AdminPulseHttpService } from './admin-pulse-http.service';
import { ADMIN_PULSE_BASE_URL } from './admin-pulse.constants';
import { CompaniesClient } from './clients/companies.client';
import { HierarchyClient } from './clients/hierarchy.client';
import { InvoiceSchedulesClient } from './clients/invoice-schedules.client';
import { InvoicesClient } from './clients/invoices.client';
import { RegistrationsClient } from './clients/registrations.client';
import { RelationsClient } from './clients/relations.client';
import { UsersClient } from './clients/users.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('ADMIN_PULSE_TIMEOUT_MS', 30_000),
      }),
    }),
  ],
  providers: [
    {
      provide: ADMIN_PULSE_BASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>(
          'ADMIN_PULSE_BASE_URL',
          'https://api.adminpulse.be',
        ),
    },
    AdminPulseHttpService,
    AdminPulseAuthGuard,
    CompaniesClient,
    UsersClient,
    RelationsClient,
    InvoiceSchedulesClient,
    HierarchyClient,
    RegistrationsClient,
    InvoicesClient,
  ],
  exports: [
    AdminPulseAuthGuard,
    CompaniesClient,
    UsersClient,
    RelationsClient,
    InvoiceSchedulesClient,
    HierarchyClient,
    RegistrationsClient,
    InvoicesClient,
  ],
})
export class AdminPulseModule {}
