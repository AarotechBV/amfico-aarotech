import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CompanyDto } from '@amfico@aarotech/admin-pulse-shared';
import type { TCreatedPdf } from 'pdfmake/interfaces';
import { endOfLastMonth } from '../../utils/end-of-last-month.util';
import { RegistrationsPdfService } from '../../services/registrations-pdf.service';
import { CompaniesService } from '../../services/companies.service';
import { MeService } from '../../services/me.service';
import {
  OverviewService,
  RegistrationsOverviewResponse,
} from '../../services/overview.service';

@Component({
  selector: 'ap-registrations-overview',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registrations-overview.page.html',
  styleUrl: './registrations-overview.page.scss',
})
export class RegistrationsOverviewPage {
  readonly #companiesService = inject(CompaniesService);
  readonly #overview = inject(OverviewService);
  readonly #pdfService = inject(RegistrationsPdfService);
  readonly me = inject(MeService);

  registrationDateUntil = signal<Date | null>(endOfLastMonth());
  invoiced = signal(false);
  selectedCompanyId = signal<string | null>(null);

  companies = signal<CompanyDto[]>([]);
  response = signal<RegistrationsOverviewResponse | null>(null);
  pdf = signal<TCreatedPdf | null>(null);

  isLoadingCompanies = signal(false);
  isLoadingOverview = signal(false);
  errors = signal<string[]>([]);

  status = computed<'no-office' | 'loading' | 'empty' | 'ready'>(() => {
    if (!this.me.activeOfficeId()) return 'no-office';
    if (this.isLoadingCompanies() || this.isLoadingOverview() || !this.pdf()) {
      return 'loading';
    }
    if (!this.response()?.relations.length) return 'empty';
    return 'ready';
  });

  statusMessage = computed(() => {
    if (!this.me.activeOfficeId()) {
      return 'Kies een kantoor in de header om verder te gaan.';
    }
    if (this.isLoadingCompanies()) return 'Bedrijven ophalen…';
    if (this.isLoadingOverview()) return 'Registraties ophalen…';
    if (!this.pdf()) return 'PDF aan het opbouwen…';
    if (!this.response()?.relations.length) {
      return 'Geen registraties gevonden voor deze selectie.';
    }
    return 'PDF is klaar om te downloaden.';
  });

  /**
   * Reload companies whenever the active office changes (super_admin
   * switching, or initial me-load). Skips when there's no active office
   * — the backend would 400 because /companies needs an office key.
   */
  reloadOnActiveOffice = effect(() => {
    const officeId = this.me.activeOfficeId();
    untracked(() => {
      if (!officeId) {
        this.companies.set([]);
        this.response.set(null);
        this.pdf.set(null);
        this.selectedCompanyId.set(null);
        return;
      }
      this.#loadCompanies();
    });
  });

  selectFirstCompany = effect(() => {
    const companies = this.companies();
    untracked(() => {
      if (companies.length && !this.selectedCompanyId()) {
        this.selectedCompanyId.set(companies[0].id);
      }
    });
  });

  loadOverview = effect(() => {
    const invoiced = this.invoiced();
    const date = this.registrationDateUntil();
    const companyId = this.selectedCompanyId();
    untracked(() => {
      if (!date || !companyId) return;
      this.pdf.set(null);
      this.response.set(null);
      this.isLoadingOverview.set(true);
      this.#overview
        .getRegistrationsOverview({
          registrationDateUntil: toIsoDate(date),
          companyId,
          invoiced,
        })
        .subscribe({
          next: (response) => {
            this.response.set(response);
            this.isLoadingOverview.set(false);
            this.#buildPdf(response, date);
          },
          error: (err) => {
            this.#pushError('overview', err);
            this.isLoadingOverview.set(false);
          },
        });
    });
  });

  #loadCompanies() {
    this.isLoadingCompanies.set(true);
    this.#companiesService.listAll().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.isLoadingCompanies.set(false);
      },
      error: (err) => {
        this.#pushError('companies', err);
        this.isLoadingCompanies.set(false);
      },
    });
  }

  #buildPdf(response: RegistrationsOverviewResponse, date: Date) {
    if (!response.relations.length) {
      this.pdf.set(null);
      return;
    }
    try {
      this.pdf.set(
        this.#pdfService.build(response.relations, response.hierarchy, date),
      );
    } catch (err) {
      this.#pushError('pdf', err);
    }
  }

  #pushError(scope: string, err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
    this.errors.update((errs) => [...errs, `${scope}: ${message}`]);
  }

  clearErrors() {
    this.errors.set([]);
  }

  download() {
    this.pdf()?.download('admin-pulse.pdf');
  }

  selectDate(event: Event) {
    const input = event.target as HTMLInputElement;
    this.registrationDateUntil.set(input.valueAsDate);
  }

  selectCompany(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedCompanyId.set(select.value || null);
  }
}

const toIsoDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
