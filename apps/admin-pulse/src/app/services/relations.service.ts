import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageDto } from '../models/page.dto';
import { RelationDto } from '../models/relation.dto';

@Injectable({
  providedIn: 'root',
})
export class RelationsService {
  readonly #httpClient = inject(HttpClient);

  listAllRelations(page = 0, pageSize = 20) {
    const params = new HttpParams({ fromObject: { page, pageSize } });
    return this.#httpClient.get<PageDto<RelationDto>>(
      'https://api.adminpulse.be/relations',
      { params }
    );
  }
}
