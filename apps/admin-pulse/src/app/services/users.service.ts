import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageDto } from '../models/page.dto';
import { UserDto } from '../models/user.dto';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  readonly #httpClient = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  listUsers(page = 0, pageSize = 400) {
    const params = new HttpParams({ fromObject: { page, pageSize } });
    return this.#httpClient.get<PageDto<UserDto>>(`${this.#baseUrl}/users`, {
      params,
    });
  }
}
