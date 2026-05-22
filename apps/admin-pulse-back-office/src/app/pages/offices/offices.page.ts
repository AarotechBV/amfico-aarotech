import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AdminService,
  OfficeApiKeyMetadata,
  OfficeSummary,
} from '../../services/admin.service';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; office: OfficeSummary }
  | {
      kind: 'apiKey';
      office: OfficeSummary;
      metadata: OfficeApiKeyMetadata | null;
    }
  | { kind: 'delete'; office: OfficeSummary }
  | null;

@Component({
  selector: 'ap-offices',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offices.page.html',
  styleUrl: '../users/users.page.scss',
})
export class OfficesPage {
  readonly #admin = inject(AdminService);
  readonly #destroyRef = inject(DestroyRef);

  offices = signal<OfficeSummary[]>([]);
  search = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  dialog = signal<Dialog>(null);
  saving = signal(false);

  filteredOffices = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.offices();
    return this.offices().filter((o) =>
      o.name.toLowerCase().includes(term),
    );
  });

  createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    apiKey: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  editForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  apiKeyForm = new FormGroup({
    key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  constructor() {
    this.refresh();
  }

  refresh() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.#admin
      .listOffices()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (offices) => {
        this.offices.set(offices);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon kantoren niet laden.',
        );
      },
    });
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  openCreate() {
    this.createForm.reset({ name: '', apiKey: '' });
    this.dialog.set({ kind: 'create' });
  }

  openEdit(office: OfficeSummary) {
    this.editForm.reset({
      name: office.name,
      isActive: office.isActive,
    });
    this.dialog.set({ kind: 'edit', office });
  }

  openApiKey(office: OfficeSummary) {
    this.apiKeyForm.reset({ key: '' });
    this.#admin
      .getOfficeApiKey(office.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (metadata) => this.dialog.set({ kind: 'apiKey', office, metadata }),
      error: (err) =>
        this.errorMessage.set(
          err?.error?.message ?? 'Kon API-sleutel niet ophalen.',
        ),
    });
  }

  openDelete(office: OfficeSummary) {
    this.dialog.set({ kind: 'delete', office });
  }

  closeDialog() {
    this.dialog.set(null);
  }

  submitCreate() {
    if (this.createForm.invalid) return;
    const { name, apiKey } = this.createForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .createOffice({ name, apiKey })
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
            err?.error?.message ?? 'Kon kantoor niet aanmaken.',
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
      .updateOffice(d.office.id, body)
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

  submitApiKey() {
    const d = this.dialog();
    if (d?.kind !== 'apiKey') return;
    if (this.apiKeyForm.invalid) return;
    const { key } = this.apiKeyForm.getRawValue();
    this.saving.set(true);
    this.#admin
      .setOfficeApiKey(d.office.id, { key })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (metadata) => {
        this.saving.set(false);
        this.dialog.set({ kind: 'apiKey', office: d.office, metadata });
        this.apiKeyForm.reset({ key: '' });
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

  confirmDelete() {
    const d = this.dialog();
    if (d?.kind !== 'delete') return;
    this.saving.set(true);
    this.#admin
      .deleteOffice(d.office.id)
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
          err?.error?.message ?? 'Kon kantoor niet verwijderen.',
        );
      },
    });
  }

  clearError() {
    this.errorMessage.set(null);
  }
}
