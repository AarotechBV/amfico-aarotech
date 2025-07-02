import { RelationDto } from './relation.dto';
import { Registration } from './registration.model';
import { CompanyDto } from './company.dto';

export interface GroupedRelation extends RelationDto {
  company: CompanyDto;
  displayNames: string[];
  startCode: string;
  uniqueIdentifiers: string[];
  codes: string[];
  mainName?: string;
}

export interface Relation extends GroupedRelation {
  registrations: Registration[];
}
