import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AdminService,
  ApiKeyMetadata,
  CredentialPayload,
  UserSummary,
} from '../../services/admin.service';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: UserSummary }
  | { kind: 'reset'; user: UserSummary }
  | { kind: 'apiKey'; user: UserSummary; metadata: ApiKeyMetadata | null }
  | { kind: 'delete'; user: UserSummary }
  | { kind: 'credential'; user: UserSummary; credential: CredentialPayload }
  | null;

@Component({
  selector: 'ap-users',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
})
export class UsersPage {
  readonly #admin = inject(AdminService);

  users = signal<UserSummary[]>([]);
  search = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  dialog = signal<Dialog>(null);

  filteredUsers = computed(() => {
    const term = this.search().toLowerCase().trim();
    const all = this.users();
    if (!term) return all;
    return all.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        (u.fullName ?? '').toLowerCase().includes(term),
    );
  });

  createForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    fullName: new FormControl('', { nonNullable: true }),
    role: new FormControl<'user' | 'admin'>('user', { nonNullable: true }),
  });

  editForm = new FormGroup({
    fullName: new FormControl('', { nonNullable: true }),
    role: new FormControl<'user' | 'admin'>('user', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  apiKeyForm = new FormGroup({
    key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
    label: new FormControl('', { nonNullable: true }),
  });

  saving = signal(false);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.#admin.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Kon gebruikers niet laden.');
      },
    });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.search.set(input.value);
  }

  openCreate() {
    this.createForm.reset({ email: '', fullName: '', role: 'user' });
    this.dialog.set({ kind: 'create' });
  }

  openEdit(user: UserSummary) {
    this.editForm.reset({
      fullName: user.fullName ?? '',
      role: user.role,
      isActive: user.isActive,
    });
    this.dialog.set({ kind: 'edit', user });
  }

  openReset(user: UserSummary) {
    this.dialog.set({ kind: 'reset', user });
  }

  openApiKey(user: UserSummary) {
    this.apiKeyForm.reset({ key: '', label: '' });
    this.#admin.getApiKey(user.id).subscribe({
      next: (metadata) => this.dialog.set({ kind: 'apiKey', user, metadata }),
      error: (err) =>
        this.errorMessage.set(
          err?.error?.message ?? 'Kon API-sleutel niet ophalen.',
        ),
    });
  }

  openDelete(user: UserSummary) {
    this.dialog.set({ kind: 'delete', user });
  }

  closeDialog() {
    this.dialog.set(null);
  }

  submitCreate() {
    if (this.createForm.invalid) return;
    const { email, fullName, role } = this.createForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .createUser({
        email,
        fullName: fullName || undefined,
        role,
      })
      .subscribe({
        next: (credential) => {
          this.saving.set(false);
          // Fetch full row for display
          this.refresh();
          // Find the new user in the next refresh by email; meanwhile show the credential
          this.dialog.set({
            kind: 'credential',
            user: {
              id: '',
              email,
              fullName: fullName || null,
              role,
              isActive: true,
              hasApiKey: false,
              apiKeyLabel: null,
              lastSignInAt: null,
              apiKeyLastUsedAt: null,
              createdAt: new Date().toISOString(),
            },
            credential,
          });
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Kon gebruiker niet aanmaken.',
          );
        },
      });
  }

  submitEdit() {
    const d = this.dialog();
    if (d?.kind !== 'edit') return;
    if (this.editForm.invalid) return;
    const body = this.editForm.getRawValue();
    this.saving.set(true);
    this.#admin.updateUser(d.user.id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.refresh();
        this.dialog.set(null);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Wijzigingen niet opgeslagen.',
        );
      },
    });
  }

  submitReset() {
    const d = this.dialog();
    if (d?.kind !== 'reset') return;
    this.saving.set(true);
    this.#admin.resetPassword(d.user.id).subscribe({
      next: (credential) => {
        this.saving.set(false);
        this.dialog.set({ kind: 'credential', user: d.user, credential });
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon wachtwoord niet resetten.',
        );
      },
    });
  }

  submitApiKey() {
    const d = this.dialog();
    if (d?.kind !== 'apiKey') return;
    if (this.apiKeyForm.invalid) return;
    const { key, label } = this.apiKeyForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .setApiKey(d.user.id, { key, label: label || undefined })
      .subscribe({
        next: (metadata) => {
          this.saving.set(false);
          this.dialog.set({ kind: 'apiKey', user: d.user, metadata });
          this.apiKeyForm.reset({ key: '', label: '' });
          this.refresh();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Kon sleutel niet opslaan.',
          );
        },
      });
  }

  deleteApiKey() {
    const d = this.dialog();
    if (d?.kind !== 'apiKey') return;
    this.saving.set(true);
    this.#admin.deleteApiKey(d.user.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set({ kind: 'apiKey', user: d.user, metadata: null });
        this.refresh();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon sleutel niet verwijderen.',
        );
      },
    });
  }

  confirmDelete() {
    const d = this.dialog();
    if (d?.kind !== 'delete') return;
    this.saving.set(true);
    this.#admin.deleteUser(d.user.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.refresh();
        this.dialog.set(null);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon gebruiker niet verwijderen.',
        );
      },
    });
  }

  clearError() {
    this.errorMessage.set(null);
  }

  copyToClipboard(value: string) {
    void navigator.clipboard.writeText(value);
  }
}
