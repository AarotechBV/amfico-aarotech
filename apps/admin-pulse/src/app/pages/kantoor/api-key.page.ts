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
  OfficeAdminService,
  OfficeApiKeyMetadata,
} from '../../services/office-admin.service';
import { MeService } from '../../services/me.service';

@Component({
  selector: 'ap-kantoor-api-key',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-key.page.html',
  styleUrl: './kantoor.scss',
})
export class KantoorApiKeyPage {
  readonly #admin = inject(OfficeAdminService);
  readonly #destroyRef = inject(DestroyRef);
  readonly me = inject(MeService);

  metadata = signal<OfficeApiKeyMetadata | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  saving = signal(false);

  hasActiveOffice = computed(() => !!this.me.activeOfficeId());

  form = new FormGroup({
    key: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  reloadOnActiveOffice = effect(() => {
    const officeId = this.me.activeOfficeId();
    untracked(() => {
      if (officeId) this.refresh();
      else this.metadata.set(null);
    });
  });

  refresh() {
    if (!this.me.activeOfficeId()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.#admin
      .getApiKey()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (metadata) => {
        this.metadata.set(metadata);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon API-sleutel niet ophalen.',
        );
      },
    });
  }

  submit() {
    if (this.form.invalid) return;
    const { key } = this.form.getRawValue();
    this.saving.set(true);
    this.#admin
      .setApiKey({ key })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
      next: (metadata) => {
        this.saving.set(false);
        this.metadata.set(metadata);
        this.form.reset({ key: '' });
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Kon sleutel niet opslaan.',
        );
      },
    });
  }

  clearError() {
    this.errorMessage.set(null);
  }
}
