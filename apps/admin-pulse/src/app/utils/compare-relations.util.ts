import { Relation } from '../models/relation.model';
import { RelationDto } from '../models/relation.dto';

export const compareRelations = (
  relationA: Relation | RelationDto,
  relationB: Relation | RelationDto
): number => {
  const nameA = `${relationA.code || relationA.name}`;
  const nameB = `${relationB.code || relationB.name}`;

  const companyIdA = `${relationA.company?.name}`;
  const companyIdB = `${relationB.company?.name}`;

  const relationGroupNameA = relationA.relationGroupName;
  const relationGroupNameB = relationB.relationGroupName;

  const ezZonderTijdsregistratie = 'EZ zonder tijdsregistratie';

  const relationGroupNameAisEZ =
    relationGroupNameA === ezZonderTijdsregistratie;
  const relationGroupNameBisEZ =
    relationGroupNameB === ezZonderTijdsregistratie;

  if (companyIdA !== companyIdB) {
    return sortByName(companyIdA, companyIdB);
  } else if (relationGroupNameAisEZ && !relationGroupNameBisEZ) {
    return 1;
  } else if (!relationGroupNameAisEZ && relationGroupNameBisEZ) {
    return -1;
  } else {
    return sortByName(nameA, nameB);
  }
};

const sortByName = (nameA: string, nameB: string): number => {
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
};
