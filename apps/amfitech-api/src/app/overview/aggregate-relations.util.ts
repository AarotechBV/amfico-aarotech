import {
  CompanyDto,
  Hierarchy,
  Invoice,
  InvoiceDto,
  InvoicesScheduleDto,
  PriceListItemsHierarchyDto,
  Registration,
  RegistrationDto,
  Relation,
  RelationDto,
  UserDto,
} from '@amfico@aarotech/amfitech-shared';

const EZ_RELATION_GROUP = 'EZ zonder tijdsregistratie';
const ASSIGNMENT_BLACKLIST: readonly string[] = ['Softwarekosten', 'Jaarrekening'];

export const buildHierarchy = (raw: PriceListItemsHierarchyDto): Hierarchy => {
  if (!raw) return [];
  return raw.reduce<Hierarchy>((acc, item) => {
    const [category, subCategory] = item.name.split(' - ');
    const children = item.items.map((i) => ({ child: i.name, id: i.id }));

    const existing = acc.find((c) => c.category === category);
    if (existing) {
      existing.subCategories.push({ subCategory, id: item.id, children });
    } else {
      acc.push({
        category,
        subCategories: [{ id: item.id, subCategory, children }],
      });
    }
    return acc;
  }, []);
};

const compareRelations = (
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

interface AggregateInput {
  relations: RelationDto[];
  companies: CompanyDto[];
  users: UserDto[];
  schedules: InvoicesScheduleDto[];
  registrations: RegistrationDto[];
  invoices: InvoiceDto[];
  neverInvoice: boolean;
}

export const aggregateRelations = (input: AggregateInput): Relation[] => {
  const companyMap = new Map(input.companies.map((c) => [c.id, c]));
  const relationMap = new Map(
    input.relations.map((r) => [r.uniqueIdentifier, r]),
  );
  const userMap = new Map(input.users.map((u) => [u.id, u]));

  const identifiersInvoicedElsewhere = input.schedules.flatMap((s) =>
    s.invoicedOnBehalfOf.filter((id) => id !== s.relationIdentifier),
  );

  const filteredRegistrations: RegistrationDto[] = input.registrations.filter(
    (r) =>
      r.neverInvoice === input.neverInvoice &&
      !r.inFixedAmount &&
      !ASSIGNMENT_BLACKLIST.includes(r.assignmentTemplateName),
  );

  return input.relations
    .filter((r) => !identifiersInvoicedElsewhere.includes(r.uniqueIdentifier))
    .map((relationDto) => {
      const invoicedOnBehalfOfIdentifiers = [
        ...new Set(
          input.schedules
            .filter((s) => s.relationIdentifier === relationDto.uniqueIdentifier)
            .flatMap((s) => s.invoicedOnBehalfOf),
        ),
      ];
      const invoicedOnBehalfOfCodes = invoicedOnBehalfOfIdentifiers
        .map((id) => relationMap.get(id)?.code)
        .filter((code): code is string => code !== undefined);

      const ownIdentifiers = new Set([
        relationDto.uniqueIdentifier,
        ...invoicedOnBehalfOfIdentifiers,
      ]);

      const registrations: Registration[] = filteredRegistrations
        .filter((r) => ownIdentifiers.has(r.relationIdentifier))
        .map((r) => ({ ...r, user: userMap.get(r.userId) }));

      const invoices: Invoice[] = input.invoices.filter(
        (inv) => inv.relationIdentifier === relationDto.uniqueIdentifier,
      );

      return {
        ...relationDto,
        invoicedOnBehalfOfIdentifiers,
        invoicedOnBehalfOfCodes,
        company: companyMap.get(relationDto.companyId),
        registrations,
        invoices,
      };
    })
    .filter((r) => r.registrations.length > 0)
    .sort(compareRelations);
};
