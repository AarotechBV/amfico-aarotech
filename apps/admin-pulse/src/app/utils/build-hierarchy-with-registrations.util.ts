import { Hierarchy } from '../models/hierarchy.model';
import { Registration } from '../models/registration.model';

const sumBy = <T>(items: T[], pick: (item: T) => number): number =>
  items.reduce((acc, item) => acc + pick(item), 0);

export const durationHours = (reg: Registration) => reg.duration / 60;
export const billableValue = (reg: Registration) =>
  reg.duration ? durationHours(reg) : reg.quantity;
export const billableAmount = (reg: Registration) =>
  billableValue(reg) * reg.unitPrice;

export interface HierarchyChildWithRegistrations {
  child: string;
  id: string;
  registrations: Registration[];
}

export interface HierarchySubCategoryWithRegistrations {
  id: string;
  subCategory: string;
  children: HierarchyChildWithRegistrations[];
  duration: number;
  total: number;
}

export interface HierarchyCategoryWithRegistrations {
  category: string;
  subCategories: HierarchySubCategoryWithRegistrations[];
  duration: number;
  quantity: number;
  total: number;
}

export const buildHierarchyWithRegistrations = (
  hierarchy: Hierarchy,
  registrations: Registration[],
): HierarchyCategoryWithRegistrations[] => {
  const byId = new Map<string, Registration[]>();
  for (const reg of registrations) {
    const list = byId.get(reg.priceListItemIdentifier);
    if (list) {
      list.push(reg);
    } else {
      byId.set(reg.priceListItemIdentifier, [reg]);
    }
  }

  return hierarchy
    .map((category) => {
      const subCategories = category.subCategories
        .map((subCategory) => {
          const subLabel = subCategory.subCategory || category.category;
          const children: HierarchyChildWithRegistrations[] = [
            {
              child: subLabel,
              id: '',
              registrations: byId.get(subCategory.id) ?? [],
            },
            ...subCategory.children.map((child) => ({
              ...child,
              registrations: byId.get(child.id) ?? [],
            })),
          ].filter((c) => c.registrations.length > 0);

          const subRegs = children.flatMap((c) => c.registrations);
          return {
            ...subCategory,
            subCategory: subLabel,
            children,
            duration: sumBy(subRegs, durationHours),
            total: sumBy(subRegs, billableAmount),
          };
        })
        .filter((s) => s.children.length > 0);

      const catRegs = subCategories.flatMap((s) =>
        s.children.flatMap((c) => c.registrations),
      );
      return {
        ...category,
        subCategories,
        duration: sumBy(catRegs, durationHours),
        quantity: sumBy(catRegs, (r) => r.quantity),
        total: sumBy(catRegs, billableAmount),
      };
    })
    .filter((c) => c.subCategories.length > 0);
};
