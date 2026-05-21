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
import { buildHierarchyWithRegistrations } from '../../utils/build-hierarchy-with-registrations.util';

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

  hierarchyWithRegistrations = computed(() =>
    buildHierarchyWithRegistrations(this.hierarchy(), this.registrations()),
  );

  total = computed(() =>
    this.hierarchyWithRegistrations().reduce((acc, c) => acc + c.total, 0),
  );

  durationTotal = computed(() =>
    this.hierarchyWithRegistrations().reduce((acc, c) => acc + c.duration, 0),
  );

  quantityTotal = computed(() =>
    this.hierarchyWithRegistrations().reduce((acc, c) => acc + c.quantity, 0),
  );
}
