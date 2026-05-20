import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Registration } from '../../models/registration.model';
import { Hierarchy } from '../../models/hierarchy.model';
import { RelationHeaderComponent } from '../relation-header/relation-header.component';
import { Relation } from '../../models/relation.model';

const sumBy = <T>(items: T[], pick: (item: T) => number): number =>
  items.reduce((acc, item) => acc + pick(item), 0);

const durationHours = (reg: Registration) => reg.duration / 60;
const billableValue = (reg: Registration) =>
  reg.duration ? durationHours(reg) : reg.quantity;
const billableAmount = (reg: Registration) =>
  billableValue(reg) * reg.unitPrice;

@Component({
  selector: 'ap-registrations-table',
  imports: [DatePipe, DecimalPipe, RelationHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registrations-table.component.html',
  styleUrl: './registrations-table.component.scss',
})
export class RegistrationsTableComponent {
  registrations = input<Registration[]>([]);
  hierarchy = input<Hierarchy>([]);
  relation = input.required<Relation>();
  registrationDateUntil = input.required<Date>();

  #registrationsByItemId = computed(() => {
    const byId = new Map<string, Registration[]>();
    for (const reg of this.registrations()) {
      const list = byId.get(reg.priceListItemIdentifier);
      if (list) {
        list.push(reg);
      } else {
        byId.set(reg.priceListItemIdentifier, [reg]);
      }
    }
    return byId;
  });

  hierarchyWithRegistrations = computed(() => {
    const byId = this.#registrationsByItemId();

    return this.hierarchy()
      .map((category) => {
        const subCategories = category.subCategories
          .map((subCategory) => {
            const subLabel = subCategory.subCategory || category.category;
            const children = [
              {
                child: subLabel,
                id: '',
                registrations: byId.get(subCategory.id) ?? [],
              },
              ...subCategory.children.map((child) => ({
                ...child,
                registrations: byId.get(child.id) ?? [],
              })),
            ].filter((c) => c.registrations.length > 0);

            const subRegs = children.flatMap((c) => c.registrations);
            return {
              ...subCategory,
              subCategory: subLabel,
              children,
              duration: sumBy(subRegs, durationHours),
              total: sumBy(subRegs, billableAmount),
            };
          })
          .filter((s) => s.children.length > 0);

        const catRegs = subCategories.flatMap((s) =>
          s.children.flatMap((c) => c.registrations),
        );
        return {
          ...category,
          subCategories,
          duration: sumBy(catRegs, durationHours),
          quantity: sumBy(catRegs, (r) => r.quantity),
          total: sumBy(catRegs, billableAmount),
        };
      })
      .filter((c) => c.subCategories.length > 0);
  });

  total = computed(() =>
    sumBy(this.hierarchyWithRegistrations(), (c) => c.total),
  );

  durationTotal = computed(() =>
    sumBy(this.hierarchyWithRegistrations(), (c) => c.duration),
  );

  quantityTotal = computed(() =>
    sumBy(this.hierarchyWithRegistrations(), (c) => c.quantity),
  );
}
