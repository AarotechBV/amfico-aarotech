import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyDto } from '../models/company.dto';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class CompaniesService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listAllCompanies(): Observable<CompanyDto[]> {
    return this.#httpClient.get<CompanyDto[]>(`${this.#baseUrl}/companies`);
  }
}
