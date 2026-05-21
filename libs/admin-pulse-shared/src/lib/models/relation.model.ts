import { RelationDto } from './relation.dto';
import { Registration } from './registration.model';
import { CompanyDto } from './company.dto';
import { Invoice } from './invoice.dto';

// export interface GroupedRelation {
//   mainUniqueIdentifier: string;
//   mainRelation?: RelationDto;
//   linkedRelations: RelationDto[];
// }

// export interface GroupedRelation extends RelationDto {
//   company?: CompanyDto;
//   displayNames: string[];
//   startCode: string;
//   uniqueIdentifiers: string[];
//   codes: string[];
//   mainName?: string;
// }

// export interface Relation extends GroupedRelation {
//   registrations: Registration[];
// }

export interface RelationWithInvoicesSchedules extends RelationDto {
  invoicedOnBehalfOfIdentifiers: string[];
  invoicedOnBehalfOfCodes: string[];
  company?: CompanyDto;
}

export interface Relation extends RelationWithInvoicesSchedules {
  registrations: Registration[];
  invoices: Invoice[];
}
