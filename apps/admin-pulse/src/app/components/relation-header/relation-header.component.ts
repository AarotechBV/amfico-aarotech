import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Relation } from '../../models/relation.model';

@Component({
  selector: 'ap-relation-header',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './relation-header.component.html',
  styleUrl: './relation-header.component.scss',
})
export class RelationHeaderComponent {
  relation = input.required<Relation>();

  registrationDateUntil = input.required<Date>();
}
