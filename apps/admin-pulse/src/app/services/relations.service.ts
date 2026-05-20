import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageDto } from '../models/page.dto';
import { RelationDto } from '../models/relation.dto';
import { InvoicesScheduleDto } from '../models/invoices-schedule.dto';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class RelationsService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listAllRelations(page = 0, pageSize = 400) {
    const params = new HttpParams({ fromObject: { page, pageSize } });
    return this.#httpClient.get<PageDto<RelationDto>>(
      `${this.#baseUrl}/relations`,
      { params },
    );
  }

  listAllInvoicesSchedules(page = 0, pageSize = 400) {
    const params = new HttpParams({ fromObject: { page, pageSize } });
    return this.#httpClient.get<PageDto<InvoicesScheduleDto>>(
      `${this.#baseUrl}/relations/invoiceschedules`,
      { params },
    );
  }
}
