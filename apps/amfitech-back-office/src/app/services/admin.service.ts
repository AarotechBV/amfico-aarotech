import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

export type AppRole = 'user' | 'admin' | 'super_admin';

// ---------- Users ----------

export interface UserOfficeRef {
  id: string;
  name: string;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: AppRole;
  offices: UserOfficeRef[];
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName?: string;
  password?: string;
  role: AppRole;
  officeIds?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string | null;
  role?: AppRole;
  officeIds?: string[];
  isActive?: boolean;
}

export interface CredentialPayload {
  email: string;
  password: string;
}

// ---------- Offices ----------

export interface OfficeSummary {
  id: string;
  name: string;
  isActive: boolean;
  userCount: number;
  hasApiKey: boolean;
  apiKeyLastUsedAt: string | null;
  createdAt: string;
}

export interface CreateOfficeRequest {
  name: string;
  apiKey: string;
}

export interface UpdateOfficeRequest {
  name?: string;
  isActive?: boolean;
}

// ---------- API key ----------

export interface OfficeApiKeyMetadata {
  hasKey: boolean;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SetOfficeApiKeyRequest {
  key: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  // ---- Users (cross-office) ----

  listUsers(officeId?: string): Observable<UserSummary[]> {
    const params = officeId
      ? new HttpParams().set('officeId', officeId)
      : undefined;
    return this.#http.get<UserSummary[]>(`${this.#base}/admin/users`, {
      params,
    });
  }

  createUser(body: CreateUserRequest): Observable<CredentialPayload> {
    return this.#http.post<CredentialPayload>(
      `${this.#base}/admin/users`,
      body,
    );
  }

  updateUser(id: string, body: UpdateUserRequest): Observable<void> {
    return this.#http.patch<void>(`${this.#base}/admin/users/${id}`, body);
  }

  resetPassword(id: string): Observable<CredentialPayload> {
    return this.#http.post<CredentialPayload>(
      `${this.#base}/admin/users/${id}/reset-password`,
      {},
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/admin/users/${id}`);
  }

  // ---- Offices ----

  listOffices(): Observable<OfficeSummary[]> {
    return this.#http.get<OfficeSummary[]>(`${this.#base}/admin/offices`);
  }

  createOffice(body: CreateOfficeRequest): Observable<OfficeSummary> {
    return this.#http.post<OfficeSummary>(`${this.#base}/admin/offices`, body);
  }

  updateOffice(id: string, body: UpdateOfficeRequest): Observable<void> {
    return this.#http.patch<void>(`${this.#base}/admin/offices/${id}`, body);
  }

  deleteOffice(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/admin/offices/${id}`);
  }

  // ---- Office API key (super_admin uses X-Active-Office header to scope) ----

  getOfficeApiKey(officeId: string): Observable<OfficeApiKeyMetadata> {
    return this.#http.get<OfficeApiKeyMetadata>(
      `${this.#base}/office/api-key`,
      { headers: this.#officeHeader(officeId) },
    );
  }

  setOfficeApiKey(
    officeId: string,
    body: SetOfficeApiKeyRequest,
  ): Observable<OfficeApiKeyMetadata> {
    return this.#http.put<OfficeApiKeyMetadata>(
      `${this.#base}/office/api-key`,
      body,
      { headers: this.#officeHeader(officeId) },
    );
  }

  #officeHeader(officeId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Active-Office': officeId });
  }
}
