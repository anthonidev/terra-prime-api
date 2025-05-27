import { DocumentType } from "src/seed/data/config.data";

export interface SaleResponse {
  id: string;
  type: string;
  totalAmount: number;
  contractDate: string;
  saleDate: string;
  status: string;
  client: {
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  lot: {
    name: string;
    lotPrice: number;
  };
  financing: {
    initialAmount: number;
    interestRate: number;
    quantityCoutes: number;
  };
  guarantor: {
    firstName: string;
    lastName: string;
  };
  reservation: {
    amount: number;
  };
  vendor: {
    document: string;
    firstName: string;
    lastName: string;
  };
}