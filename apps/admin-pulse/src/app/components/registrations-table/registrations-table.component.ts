import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Registration } from '../../models/registration.model';
import { Hierarchy } from '../../models/hierarchy.model';
import { RelationHeaderComponent } from '../relation-header/relation-header.component';
import { Relation } from '../../models/relation.model';

@Component({
  selector: 'ap-registrations-table',
  imports: [CommonModule, RelationHeaderComponent],
  templateUrl: './registrations-table.component.html',
  styleUrl: './registrations-table.component.scss',
})
export class RegistrationsTableComponent {
  registrations = input<Registration[]>([]);

  hierarchy = input<Hierarchy>([]);

  relation = input.required<Relation>();

  registrationDateUntil = input.required<Date>();

  hierarchyWithRegistrations = computed(() => {
    return this.hierarchy()
      .map((category) => ({
        ...category,
        subCategories: category.subCategories
          .map((subCategory) => ({
            ...subCategory,
            subCategory: subCategory.subCategory || category.category,
            children: [
              {
                child: subCategory.subCategory || category.category,
                id: '',
                registrations: this.registrations().filter(
                  (registration) =>
                    registration.priceListItemIdentifier === subCategory.id
                ),
              },
              ...subCategory.children.map((child) => ({
                ...child,
                registrations: this.registrations().filter(
                  (registration) =>
                    registration.priceListItemIdentifier === child.id
                ),
              })),
            ].filter((child) => child.registrations.length > 0),
          }))
          .filter((subCategory) => subCategory.children.length > 0),
      }))
      .filter((category) => category.subCategories.length > 0)
      .map((category) => ({
        ...category,
        duration: category.subCategories
          .map((subCat) =>
            subCat.children.map((ch) =>
              ch.registrations.map((reg) => reg.duration)
            )
          )
          .flat()
          .flat()
          .reduce((acc, cur) => acc + cur / 60, 0),
        total: category.subCategories
          .map((subCat) => subCat.children.map((ch) => ch.registrations))

          .flat()
          .flat()
          .reduce((acc, cur) => acc + (cur.duration / 60) * cur.unitPrice, 0),
        subCategories: category.subCategories.map((subCat) => ({
          ...subCat,
          duration: subCat.children
            .map((ch) => ch.registrations.map((reg) => reg.duration))
            .flat()
            .reduce((acc, cur) => acc + cur / 60, 0),
          total: subCat.children
            .map((ch) => ch.registrations)
            .flat()
            .reduce((acc, cur) => acc + (cur.duration / 60) * cur.unitPrice, 0),
        })),
      }));
  });

  total = computed(() => {
    return this.hierarchyWithRegistrations().reduce(
      (acc, cur) => acc + cur.total,
      0
    );
  });

  durationTotal = computed(() => {
    return this.hierarchyWithRegistrations().reduce(
      (acc, cur) => acc + cur.duration,
      0
    );
  });
}
