import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationsOverviewStore } from './registrations-overview.store';
import { RegistrationsTableComponent } from '../../components/registrations-table/registrations-table.component';
import { FormsModule } from '@angular/forms';
import { subtractMonths } from '../../utils/substract-months.util';

@Component({
  selector: 'ap-registrations-overview',
  imports: [CommonModule, RegistrationsTableComponent, FormsModule],
  templateUrl: './registrations-overview.page.html',
  styleUrl: './registrations-overview.page.scss',
  providers: [RegistrationsOverviewStore],
})
export class RegistrationsOverviewPage {
  readonly #store = inject(RegistrationsOverviewStore);

  registrationDateUntil: WritableSignal<Date | null> = signal<Date | null>(
    null
  );
  invoiced: WritableSignal<boolean> = signal<boolean>(false);
  selectedCompanyId: WritableSignal<string | null> = signal<string | null>(
    null
  );

  // debug = effect(() => {
  //   const schedules = this.#store.invoicesScheduleEntities();
  //   const relations = this.#store.relationEntities();
  //   const relationsWithRegistrations = this.#store.relationsWithRegistrations();
  //   untracked(() => {
  // console.log(relations.filter((r) => r.code === '5025'));
  // console.log(
  //   schedules.filter(
  //     (s) =>
  //       s.relationIdentifier === 'APR00510' ||
  //       s.invoicedOnBehalfOf.includes('APR00510')
  //   )
  // );
  //     console.log(
  //       relationsWithRegistrations
  //         // .filter((r) => r.code === '1007')
  //         .map((r) =>
  //           r.registrations.filter(
  //             (registration) =>
  //               registration.priceListItemCode ===
  //                 '100997ee-e7a7-459c-e803-08dd746e671d' ||
  //               registration.priceListItemIdentifier ===
  //                 '100997ee-e7a7-459c-e803-08dd746e671d'
  //           )
  //         )
  //         .filter((r) => r.length)
  //     );
  //   });
  // });

  relationsWithRegistrations = this.#store.relationsWithRegistrations;
  companies = this.#store.companyEntities;
  hierarchy = this.#store.hierarchy;
  isLoading = this.#store.isLoading;

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
        (relation) => relation.companyId === companyId
      );
    } else {
      return [];
    }
  });

  loadRegistrations = effect(() => {
    const invoiced = this.invoiced();
    const registrationDateUntil = this.registrationDateUntil();
    untracked(() => {
      if (registrationDateUntil) {
        this.#store.loadRegistrations({
          request: {
            neverInvoice: false,
            invoiced,
            registrationDateUntil: dateToString(registrationDateUntil),
          },
          page: 0,
        });
        this.#store.loadInvoices({
          request: {
            invoiceDateFrom: dateToString(
              subtractMonths(registrationDateUntil, 3)
            ),
          },
          page: 0,
        });
      }
    });
  });

  print() {
    window.print();
  }

  selectDate(event: any) {
    this.registrationDateUntil.set(event.target.valueAsDate || null);
  }

  selectCompany(companyId: any) {
    console.log('select', companyId);
    this.selectedCompanyId.set(companyId);
  }
}

const dateToString = (date: Date): string => {
  let day = `${date.getDate()}`;
  if (day.length < 2) {
    day = `0${day}`;
  }
  let month = `${date.getMonth() + 1}`;
  if (month.length < 2) {
    month = `0${month}`;
  }
  const year = `${date.getFullYear()}`;
  const stringDate = `${day}${month}${year}`;
  return stringDate;
};
