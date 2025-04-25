import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RegistrationDto } from '../models/registration.dto';
import { PageDto } from '../models/page.dto';
import { PriceListItemDto } from '../models/price-list-item.dto';
import { PriceListItemsHierarchyDto } from '../models/price-list-Items-hierarchy.dto';

@Injectable({
  providedIn: 'root',
})
export class RegistrationsService {
  readonly #httpClient = inject(HttpClient);

  listRegistrations(page = 0, pageSize = 20) {
    const params = new HttpParams({
      fromObject: { invoiced: false, page, pageSize },
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
