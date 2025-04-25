import { RelationDto } from './relation.dto';
import { Registration } from './registration.model';

export interface Relation extends RelationDto {
  registrations: Registration[];
}
