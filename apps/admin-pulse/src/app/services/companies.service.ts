import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CompanyDto } from '@amfico@aarotech/admin-pulse-shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listAll(): Observable<CompanyDto[]> {
    return this.#httpClient.get<CompanyDto[]>(`${this.#baseUrl}/companies`);
  }
}
