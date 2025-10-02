import {
  Component,
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
    // null
    new Date(new Date().setDate(1))
  );
  invoiced: WritableSignal<boolean> = signal<boolean>(false);

  relationsWithRegistrations = this.#store.relationsWithRegistrations;
  hierarchy = this.#store.hierarchy;
  isLoading = this.#store.isLoading;

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
          pageSize: 0,
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
