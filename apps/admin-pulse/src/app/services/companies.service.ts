import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyDto } from '../models/company.dto';

@Injectable({
  providedIn: 'root',
})
export class CompaniesService {
  readonly #httpClient = inject(HttpClient);

  listAllCompanies(): Observable<CompanyDto[]> {
    return this.#httpClient.get<CompanyDto[]>(
      'https://api.adminpulse.be/companies'
    );
  }
}
