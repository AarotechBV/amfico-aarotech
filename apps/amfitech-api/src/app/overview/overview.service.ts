import { Injectable } from '@nestjs/common';
import { CompaniesClient } from '../admin-pulse/clients/companies.client';
import { HierarchyClient } from '../admin-pulse/clients/hierarchy.client';
import { InvoiceSchedulesClient } from '../admin-pulse/clients/invoice-schedules.client';
import { InvoicesClient } from '../admin-pulse/clients/invoices.client';
import { RegistrationsClient } from '../admin-pulse/clients/registrations.client';
import { RelationsClient } from '../admin-pulse/clients/relations.client';
import { UsersClient } from '../admin-pulse/clients/users.client';
import {
  aggregateRelations,
  buildHierarchy,
} from './aggregate-relations.util';
import {
  isoDateToAdminPulse,
  subtractMonthsIso,
} from './format-admin-pulse-date.util';
import {
  RegistrationsOverviewQueryDto,
  RegistrationsOverviewResponseDto,
} from './registrations-overview.dto';

const INVOICE_LOOKBACK_MONTHS = 3;

@Injectable()
export class OverviewService {
  constructor(
    private readonly companies: CompaniesClient,
    private readonly users: UsersClient,
    private readonly relations: RelationsClient,
    private readonly invoiceSchedules: InvoiceSchedulesClient,
    private readonly hierarchy: HierarchyClient,
    private readonly registrations: RegistrationsClient,
    private readonly invoices: InvoicesClient,
  ) {}

  async getRegistrationsOverview(
    token: string,
    query: RegistrationsOverviewQueryDto,
  ): Promise<RegistrationsOverviewResponseDto> {
    const registrationDateUntil = isoDateToAdminPulse(query.registrationDateUntil);
    const invoiceDateFrom = isoDateToAdminPulse(
      subtractMonthsIso(query.registrationDateUntil, INVOICE_LOOKBACK_MONTHS),
    );

    const [
      companies,
      users,
      relations,
      schedules,
      hierarchyRaw,
      registrations,
      invoices,
    ] = await Promise.all([
      this.companies.listAll(token),
      this.users.listAll(token),
      this.relations.listAll(token),
      this.invoiceSchedules.listAll(token),
      this.hierarchy.list(token),
      this.registrations.listAll(token, {
        registrationDateUntil,
        invoiced: query.invoiced,
      }),
      this.invoices.listAll(token, { invoiceDateFrom }),
    ]);

    const aggregated = aggregateRelations({
      relations,
      companies,
      users,
      schedules,
      registrations,
      invoices,
      neverInvoice: false,
    });

    return {
      hierarchy: buildHierarchy(hierarchyRaw),
      relations: aggregated.filter((r) => r.companyId === query.companyId),
    };
  }
}
