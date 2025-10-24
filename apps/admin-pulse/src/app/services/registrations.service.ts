import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RegistrationDto } from '../models/registration.dto';
import { PageDto } from '../models/page.dto';
import { PriceListItemDto } from '../models/price-list-item.dto';
import { PriceListItemsHierarchyDto } from '../models/price-list-Items-hierarchy.dto';
import { RegistrationsRequestDto } from '../models/registrations-request.dto';

@Injectable({
  providedIn: 'root',
})
export class RegistrationsService {
  readonly #httpClient = inject(HttpClient);

  listRegistrations(
    request: RegistrationsRequestDto,
    page = 0,
    pageSize = 400
  ) {
    const params = new HttpParams({
      fromObject: {
        ...request,
        page,
        pageSize,
      },
    });

    return this.#httpClient.get<PageDto<RegistrationDto>>(
      'https://api.adminpulse.be/registrations',
      { params }
    );
  }

  listPriceListItems() {
    return this.#httpClient.get<PriceListItemDto[]>(
      'https://api.adminpulse.be/registrations/pricelistitems'
    );
  }

  listPriceListItemsHierarchy() {
    return this.#httpClient.get<PriceListItemsHierarchyDto>(
      'https://api.adminpulse.be/registrations/pricelistitems/tree'
    );
  }
}
