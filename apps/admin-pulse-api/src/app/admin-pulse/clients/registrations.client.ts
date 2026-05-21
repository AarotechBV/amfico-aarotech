import { Injectable } from '@nestjs/common';
import {
  PageDto,
  RegistrationDto,
} from '@amfico@aarotech/admin-pulse-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { fetchAllPages } from '../admin-pulse-paginate.util';

export interface ListRegistrationsRequest {
  registrationDateUntil: string; // ddMMyyyy
  invoiced?: boolean;
}

@Injectable()
export class RegistrationsClient {
  constructor(private readonly http: AdminPulseHttpService) {}

  /**
   * Lists all registrations matching the given filters, exhausting AdminPulse
   * pagination. Results are not cached because they are date-dependent.
   */
  listAll(
    token: string,
    request: ListRegistrationsRequest,
  ): Promise<RegistrationDto[]> {
    return fetchAllPages((page, pageSize) =>
      this.http.get<PageDto<RegistrationDto>>('/registrations', token, {
        registrationDateUntil: request.registrationDateUntil,
        invoiced: request.invoiced,
        page,
        pageSize,
      }),
    );
  }
}
