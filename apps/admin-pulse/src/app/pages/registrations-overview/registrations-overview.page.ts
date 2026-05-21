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
import { RegistrationsOverviewStore } from './registrations-overview.store';
import { RegistrationsTableComponent } from '../../components/registrations-table/registrations-table.component';
import { subtractMonths } from '../../utils/subtract-months.util';
import { endOfLastMonth } from '../../utils/end-of-last-month.util';
import { RegistrationsPdfService } from '../../services/registrations-pdf.service';

@Component({
  selector: 'ap-registrations-overview',
  imports: [DatePipe, RegistrationsTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registrations-overview.page.html',
  styleUrl: './registrations-overview.page.scss',
  providers: [RegistrationsOverviewStore],
})
export class RegistrationsOverviewPage {
  readonly #store = inject(RegistrationsOverviewStore);
  readonly #pdfService = inject(RegistrationsPdfService);

  registrationDateUntil = signal<Date | null>(endOfLastMonth());
  invoiced = signal(false);
  selectedCompanyId = signal<string | null>(null);

  relationsWithRegistrations = this.#store.relationsWithRegistrations;
  companies = this.#store.companyEntities;
  hierarchy = this.#store.hierarchy;
  isLoading = this.#store.isLoading;
  errors = this.#store.errors;

  clearErrors() {
    this.#store.clearErrors();
  }

  selectFirstCompany = effect(() => {
    const companies = this.companies();
    untracked(() => {
      if (companies.length && !this.selectedCompanyId()) {
        this.selectedCompanyId.set(companies[0].id);
      }
    });
  });

  filteredRelationsWithRegistrations = computed(() => {
    const companyId = this.selectedCompanyId();
    const relationsWithRegistrations = this.relationsWithRegistrations();
    if (companyId) {
      return relationsWithRegistrations.filter(
        (relation) => relation.companyId === companyId,
      );
    }
    return [];
  });

  loadRegistrations = effect(() => {
    const invoiced = this.invoiced();
    const registrationDateUntil = this.registrationDateUntil();
    untracked(() => {
      if (registrationDateUntil) {
        this.#store.loadRegistrations({
          neverInvoice: false,
          invoiced,
          registrationDateUntil: dateToString(registrationDateUntil),
        });
        this.#store.loadInvoices({
          invoiceDateFrom: dateToString(
            subtractMonths(registrationDateUntil, 3),
          ),
        });
      }
    });
  });

  print() {
    const date = this.registrationDateUntil();
    if (!date) return;
    this.#pdfService.generate(
      this.filteredRelationsWithRegistrations(),
      this.hierarchy(),
      date,
    );
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

const dateToString = (date: Date): string => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${day}${month}${year}`;
};
