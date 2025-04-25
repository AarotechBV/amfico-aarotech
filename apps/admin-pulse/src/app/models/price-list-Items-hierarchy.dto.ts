export type PriceListItemsHierarchyDto = {
  items: {
    id: string;
    code: string;
    name: string;
    type: number;
    billable: boolean;
    inFixedAmount: boolean;
    purchasePrice: any;
  }[];
  id: string;
  code: string;
  name: string;
  type: number;
  billable: boolean;
  inFixedAmount: boolean;
  purchasePrice: any;
}[];
