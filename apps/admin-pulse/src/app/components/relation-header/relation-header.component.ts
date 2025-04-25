import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Relation } from '../../models/relation.model';

@Component({
  selector: 'ap-relation-header',
  imports: [CommonModule],
  templateUrl: './relation-header.component.html',
  styleUrl: './relation-header.component.scss',
})
export class RelationHeaderComponent {
  relation = input.required<Relation>();

  today = new Date();
}
