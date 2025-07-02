import { Relation } from '../models/relation.model';
import { RelationDto } from '../models/relation.dto';

export const compareRelations = (
  relationA: Relation | RelationDto,
  relationB: Relation | RelationDto
): number => {
  const nameA = `${relationA.companyId}${relationA.code || relationA.name}`;
  const nameB = `${relationB.companyId}${relationB.code || relationB.name}`;

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
};
