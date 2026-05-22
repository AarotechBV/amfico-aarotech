import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

export type OfficeAssignableRole = 'user' | 'admin';

export interface OfficeUserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: OfficeAssignableRole | 'super_admin';
  officeId: string | null;
  officeName: string | null;
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface CreateOfficeUserRequest {
  email: string;
  fullName?: string;
  password?: string;
  role?: OfficeAssignableRole;
}

export interface UpdateOfficeUserRequest {
  fullName?: string;
  role?: OfficeAssignableRole;
  isActive?: boolean;
}

export interface CredentialPayload {
  email: string;
  password: string;
}

export interface OfficeApiKeyMetadata {
  hasKey: boolean;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SetOfficeApiKeyRequest {
  key: string;
  label?: string;
}

@Injectable({ providedIn: 'root' })
export class OfficeAdminService {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  // Users
  listUsers(): Observable<OfficeUserSummary[]> {
    return this.#http.get<OfficeUserSummary[]>(`${this.#base}/office/users`);
  }
  createUser(body: CreateOfficeUserRequest): Observable<CredentialPayload> {
    return this.#http.post<CredentialPayload>(
      `${this.#base}/office/users`,
      body,
    );
  }
  updateUser(id: string, body: UpdateOfficeUserRequest): Observable<void> {
    return this.#http.patch<void>(`${this.#base}/office/users/${id}`, body);
  }
  resetPassword(id: string): Observable<CredentialPayload> {
    return this.#http.post<CredentialPayload>(
      `${this.#base}/office/users/${id}/reset-password`,
      {},
    );
  }
  deleteUser(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/office/users/${id}`);
  }

  // API key
  getApiKey(): Observable<OfficeApiKeyMetadata> {
    return this.#http.get<OfficeApiKeyMetadata>(`${this.#base}/office/api-key`);
  }
  setApiKey(body: SetOfficeApiKeyRequest): Observable<OfficeApiKeyMetadata> {
    return this.#http.put<OfficeApiKeyMetadata>(
      `${this.#base}/office/api-key`,
      body,
    );
  }
  deleteApiKey(): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/office/api-key`);
  }
}
