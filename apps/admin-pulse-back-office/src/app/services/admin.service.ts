import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

export type AppRole = 'user' | 'admin';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  hasApiKey: boolean;
  apiKeyLabel: string | null;
  lastSignInAt: string | null;
  apiKeyLastUsedAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  fullName?: string;
  password?: string;
  role?: AppRole;
}

export interface UpdateUserRequest {
  fullName?: string;
  role?: AppRole;
  isActive?: boolean;
}

export interface CredentialPayload {
  email: string;
  password: string;
}

export interface ApiKeyMetadata {
  hasKey: boolean;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SetApiKeyRequest {
  key: string;
  label?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  readonly #http = inject(HttpClient);
  readonly #base = inject(API_BASE_URL);

  listUsers(): Observable<UserSummary[]> {
    return this.#http.get<UserSummary[]>(`${this.#base}/admin/users`);
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

  resetPassword(
    id: string,
    password?: string,
  ): Observable<CredentialPayload> {
    return this.#http.post<CredentialPayload>(
      `${this.#base}/admin/users/${id}/reset-password`,
      password ? { password } : {},
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.#http.delete<void>(`${this.#base}/admin/users/${id}`);
  }

  getApiKey(userId: string): Observable<ApiKeyMetadata> {
    return this.#http.get<ApiKeyMetadata>(
      `${this.#base}/admin/users/${userId}/api-key`,
    );
  }

  setApiKey(
    userId: string,
    body: SetApiKeyRequest,
  ): Observable<ApiKeyMetadata> {
    return this.#http.put<ApiKeyMetadata>(
      `${this.#base}/admin/users/${userId}/api-key`,
      body,
    );
  }

  deleteApiKey(userId: string): Observable<void> {
    return this.#http.delete<void>(
      `${this.#base}/admin/users/${userId}/api-key`,
    );
  }
}
