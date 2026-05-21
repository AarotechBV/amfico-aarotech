import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Hierarchy, Relation } from '@amfico@aarotech/admin-pulse-shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

export interface RegistrationsOverviewResponse {
  hierarchy: Hierarchy;
  relations: Relation[];
}

export interface RegistrationsOverviewQuery {
  registrationDateUntil: string; // yyyy-MM-dd
  companyId: string;
  invoiced?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OverviewService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  getRegistrationsOverview(
    query: RegistrationsOverviewQuery,
  ): Observable<RegistrationsOverviewResponse> {
    let params = new HttpParams()
      .set('registrationDateUntil', query.registrationDateUntil)
      .set('companyId', query.companyId);
    if (query.invoiced !== undefined) {
      params = params.set('invoiced', String(query.invoiced));
    }
    return this.#httpClient.get<RegistrationsOverviewResponse>(
      `${this.#baseUrl}/registrations-overview`,
      { params },
    );
  }
}
