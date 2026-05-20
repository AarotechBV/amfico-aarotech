import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageDto } from '../models/page.dto';
import { InvoicesRequestDto } from '../models/invoices-request.dto';
import { InvoiceDto } from '../models/invoice.dto';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listAllInvoices(request: InvoicesRequestDto, page = 0, pageSize = 400) {
    const params = new HttpParams({
      fromObject: { ...request, page, pageSize },
    });
    return this.#httpClient.get<PageDto<InvoiceDto>>(
      `${this.#baseUrl}/invoices`,
      { params },
    );
  }
}
