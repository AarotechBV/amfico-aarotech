import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RegistrationDto } from '../models/registration.dto';
import { PageDto } from '../models/page.dto';
import { PriceListItemDto } from '../models/price-list-item.dto';
import { PriceListItemsHierarchyDto } from '../models/price-list-items-hierarchy.dto';
import { RegistrationsRequestDto } from '../models/registrations-request.dto';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class RegistrationsService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listRegistrations(
    request: RegistrationsRequestDto,
    page = 0,
    pageSize = 400,
  ) {
    const params = new HttpParams({
      fromObject: { ...request, page, pageSize },
    });
    return this.#httpClient.get<PageDto<RegistrationDto>>(
      `${this.#baseUrl}/registrations`,
      { params },
    );
  }

  listPriceListItems() {
    return this.#httpClient.get<PriceListItemDto[]>(
      `${this.#baseUrl}/registrations/pricelistitems`,
    );
  }

  listPriceListItemsHierarchy() {
    return this.#httpClient.get<PriceListItemsHierarchyDto>(
      `${this.#baseUrl}/registrations/pricelistitems/tree`,
    );
  }
}
