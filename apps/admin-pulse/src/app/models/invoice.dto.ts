export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  status: string;
  invoiceType: string;
  paid: boolean;
  discountType: number;
  discountValue: number;
  originalAmount: number;
  adjustedAmount: number;
  relationIdentifier: string;
  invoiceDate: string;
  dueDate: string;
}

export interface Invoice extends InvoiceDto {
  dueDateAsDate: Date | null;
}
