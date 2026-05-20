import { Relation } from '../models/relation.model';
import { RelationDto } from '../models/relation.dto';
import { EZ_RELATION_GROUP } from '../constants';

export const compareRelations = (
  a: Relation | RelationDto,
  b: Relation | RelationDto,
): number => {
  const companyA = a.company?.name ?? '';
  const companyB = b.company?.name ?? '';
  if (companyA !== companyB) {
    return companyA.localeCompare(companyB);
  }

  const aIsEZ = a.relationGroupName === EZ_RELATION_GROUP;
  const bIsEZ = b.relationGroupName === EZ_RELATION_GROUP;
  if (aIsEZ !== bIsEZ) {
    return aIsEZ ? 1 : -1;
  }

  const nameA = a.code || a.name || '';
  const nameB = b.code || b.name || '';
  return nameA.localeCompare(nameB);
};
