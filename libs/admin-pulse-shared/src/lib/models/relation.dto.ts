import { CompanyDto } from './company.dto';

export interface RelationDto {
  id: string;
  name: string;
  code: string;
  displayName: string;
  company?: CompanyDto;
  uniqueIdentifier: string;
  accountingRelationcode: string;
  legalForm: string;
  companyId: string;
  tos: { linkType: RelationLinkType; uniqueIdentifier: string }[];
  relationGroupName?: string;
}

export enum RelationLinkType {
  CONTACT = 1,
  BENEFICIARY = 2,
  TRUSTEE = 3,
  OWNER_DIRECTOR = 4,
  PARTNER = 5,
  SHAREHOLDER = 6,
  AUDITOR = 7,
  OTHER_MEANS = 8,
}

export const toInvoiceRelationLinkTypes = [
  RelationLinkType.BENEFICIARY,
  RelationLinkType.OWNER_DIRECTOR,
];
