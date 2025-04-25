import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PageDto } from '../models/page.dto';
import { UserDto } from '../models/user.dto';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  readonly #httpClient = inject(HttpClient);

  listUsers(page = 0, pageSize = 20) {
    const params = new HttpParams({ fromObject: { page, pageSize } });
    return this.#httpClient.get<PageDto<UserDto>>(
      'https://api.adminpulse.be/users',
      { params }
    );
  }
}
