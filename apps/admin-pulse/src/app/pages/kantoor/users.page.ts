import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CredentialPayload,
  OfficeAdminService,
  OfficeUserSummary,
} from '../../services/office-admin.service';
import { MeService } from '../../services/me.service';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: OfficeUserSummary }
  | { kind: 'reset'; user: OfficeUserSummary }
  | { kind: 'delete'; user: OfficeUserSummary }
  | { kind: 'credential'; email: string; credential: CredentialPayload }
  | null;

@Component({
  selector: 'ap-kantoor-users',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.page.html',
  styleUrl: './kantoor.scss',
})
export class KantoorUsersPage {
  readonly #admin = inject(OfficeAdminService);
  readonly #destroyRef = inject(DestroyRef);
  readonly me = inject(MeService);

  users = signal<OfficeUserSummary[]>([]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  dialog = signal<Dialog>(null);
  saving = signal(false);

  search = signal('');
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

  hasActiveOffice = computed(() => !!this.me.activeOfficeId());

  createForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    lastName: new FormControl('', { nonNullable: true }),
    role: new FormControl<'user' | 'admin'>('user', { nonNullable: true }),
  });

  editForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    lastName: new FormControl('', { nonNullable: true }),
    role: new FormControl<'user' | 'admin'>('user', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  refresh = () => {
    if (!this.me.activeOfficeId()) {
      this.users.set([]);
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.#admin
      .listUsers()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon gebruikers niet laden.',
        );
      },
    });
  };

  reloadOnActiveOffice = effect(() => {
    const officeId = this.me.activeOfficeId();
    untracked(() => {
      if (officeId) this.refresh();
      else this.users.set([]);
    });
  });

  onSearch(e: Event) {
    this.search.set((e.target as HTMLInputElement).value);
  }

  openCreate() {
    this.createForm.reset({
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
    });
    this.dialog.set({ kind: 'create' });
  }

  openEdit(user: OfficeUserSummary) {
    this.editForm.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      role: user.role === 'super_admin' ? 'admin' : user.role,
      isActive: user.isActive,
    });
    this.dialog.set({ kind: 'edit', user });
  }

  openReset(user: OfficeUserSummary) {
    this.dialog.set({ kind: 'reset', user });
  }

  openDelete(user: OfficeUserSummary) {
    this.dialog.set({ kind: 'delete', user });
  }

  closeDialog() {
    this.dialog.set(null);
  }

  submitCreate() {
    if (this.createForm.invalid) return;
    const { email, firstName, lastName, role } = this.createForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .createUser({
        email,
        firstName,
        lastName: lastName || undefined,
        role,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (credential) => {
          this.saving.set(false);
          this.refresh();
          this.dialog.set({ kind: 'credential', email, credential });
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
    this.#admin
      .updateUser(d.user.id, {
        firstName: body.firstName,
        lastName: body.lastName || null,
        role: body.role,
        isActive: body.isActive,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
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
    this.#admin
      .resetPassword(d.user.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (credential) => {
        this.saving.set(false);
        this.dialog.set({
          kind: 'credential',
          email: d.user.email,
          credential,
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon wachtwoord niet resetten.',
        );
      },
    });
  }

  confirmDelete() {
    const d = this.dialog();
    if (d?.kind !== 'delete') return;
    this.saving.set(true);
    this.#admin
      .deleteUser(d.user.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
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
