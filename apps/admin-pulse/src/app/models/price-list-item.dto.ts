export interface PriceListItemDto {
  id: string;
  code: unknown;
  name: string;
  type: number;
  billable: boolean;
  inFixedAmount: boolean;
  purchasePrice: unknown;
}
