import { Injectable } from '@nestjs/common';
import { InvoiceDto, PageDto } from '@amfico@aarotech/amfitech-shared';
import { AdminPulseHttpService } from '../admin-pulse-http.service';
import { fetchAllPages } from '../admin-pulse-paginate.util';

export interface ListInvoicesRequest {
  invoiceDateFrom: string; // ddMMyyyy
}

@Injectable()
export class InvoicesClient {
  constructor(private readonly http: AdminPulseHttpService) {}

  listAll(
    token: string,
    request: ListInvoicesRequest,
  ): Promise<InvoiceDto[]> {
    return fetchAllPages((page, pageSize) =>
      this.http.get<PageDto<InvoiceDto>>('/invoices', token, {
        invoiceDateFrom: request.invoiceDateFrom,
        page,
        pageSize,
      }),
    );
  }
}
