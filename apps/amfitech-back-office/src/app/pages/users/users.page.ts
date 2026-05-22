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
import { forkJoin } from 'rxjs';
import {
  AdminService,
  AppRole,
  CredentialPayload,
  OfficeSummary,
  UserSummary,
} from '../../services/admin.service';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: UserSummary }
  | { kind: 'reset'; user: UserSummary }
  | { kind: 'delete'; user: UserSummary }
  | { kind: 'credential'; email: string; credential: CredentialPayload }
  | null;

@Component({
  selector: 'am-users',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.page.html',
  styleUrl: './users.page.scss',
})
export class UsersPage {
  readonly #admin = inject(AdminService);
  readonly #destroyRef = inject(DestroyRef);

  users = signal<UserSummary[]>([]);
  offices = signal<OfficeSummary[]>([]);
  search = signal('');
  officeFilter = signal<string>('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  dialog = signal<Dialog>(null);
  saving = signal(false);

  filteredUsers = computed(() => {
    const term = this.search().toLowerCase().trim();
    const office = this.officeFilter();
    return this.users().filter((u) => {
      if (office && !u.offices.some((o) => o.id === office)) return false;
      if (!term) return true;
      return (
        u.email.toLowerCase().includes(term) ||
        (u.fullName ?? '').toLowerCase().includes(term)
      );
    });
  });

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
    role: new FormControl<AppRole>('user', { nonNullable: true }),
    officeIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  editForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    lastName: new FormControl('', { nonNullable: true }),
    role: new FormControl<AppRole>('user', { nonNullable: true }),
    officeIds: new FormControl<string[]>([], { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  /** Office requirement is dynamic on role */
  syncCreateOfficeRequirement = effect(() => {
    const role = this.createForm.controls.role.value;
    untracked(() => {
      const ctrl = this.createForm.controls.officeIds;
      if (role === 'super_admin') {
        ctrl.setValue([]);
        ctrl.clearValidators();
      } else {
        ctrl.setValidators(nonEmptyArray);
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    });
  });

  syncEditOfficeRequirement = effect(() => {
    const role = this.editForm.controls.role.value;
    untracked(() => {
      const ctrl = this.editForm.controls.officeIds;
      if (role === 'super_admin') {
        ctrl.setValue([]);
        ctrl.clearValidators();
      } else {
        ctrl.setValidators(nonEmptyArray);
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    });
  });

  constructor() {
    this.refresh();
  }

  refresh() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      users: this.#admin.listUsers(),
      offices: this.#admin.listOffices(),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: ({ users, offices }) => {
        this.users.set(users);
        this.offices.set(offices);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon gegevens niet laden.',
        );
      },
    });
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onOfficeFilter(event: Event) {
    this.officeFilter.set((event.target as HTMLSelectElement).value);
  }

  toggleOffice(form: 'create' | 'edit', officeId: string, checked: boolean) {
    const ctrl =
      form === 'create'
        ? this.createForm.controls.officeIds
        : this.editForm.controls.officeIds;
    const current = ctrl.value;
    const next = checked
      ? current.includes(officeId)
        ? current
        : [...current, officeId]
      : current.filter((id) => id !== officeId);
    ctrl.setValue(next);
    ctrl.markAsDirty();
  }

  onOfficeCheckboxChange(form: 'create' | 'edit', officeId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.toggleOffice(form, officeId, checked);
  }

  openCreate() {
    this.createForm.reset({
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      officeIds: [],
    });
    this.dialog.set({ kind: 'create' });
  }

  openEdit(user: UserSummary) {
    this.editForm.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      role: user.role,
      officeIds: user.offices.map((o) => o.id),
      isActive: user.isActive,
    });
    this.dialog.set({ kind: 'edit', user });
  }

  openReset(user: UserSummary) {
    this.dialog.set({ kind: 'reset', user });
  }

  openDelete(user: UserSummary) {
    this.dialog.set({ kind: 'delete', user });
  }

  closeDialog() {
    this.dialog.set(null);
  }

  submitCreate() {
    if (this.createForm.invalid) return;
    const { email, firstName, lastName, role, officeIds } =
      this.createForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .createUser({
        email,
        firstName,
        lastName: lastName || undefined,
        role,
        officeIds: role === 'super_admin' ? undefined : officeIds,
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
        officeIds: body.role === 'super_admin' ? [] : body.officeIds,
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

function nonEmptyArray(control: { value: unknown }) {
  return Array.isArray(control.value) && control.value.length > 0
    ? null
    : { required: true };
}
