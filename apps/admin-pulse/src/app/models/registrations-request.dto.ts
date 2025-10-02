export interface RegistrationsRequestDto {
  registrationDateUntil: string; //ddMMyyyy
  invoiced: boolean;
  neverInvoice: boolean;
  relationIdentifier?: string;
}
