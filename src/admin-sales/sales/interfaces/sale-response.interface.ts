import { StatusPayment } from "src/admin-payments/payments/enums/status-payments.enum";

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
  secondaryClients: {
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
  }[];
  lot: {
    id: string;
    name: string;
    lotPrice: number;
  };
  financing: {
    id: string;
    initialAmount: number;
    interestRate: number;
    quantityCoutes: number;
  };
  guarantor: {
    firstName: string;
    lastName: string;
  };
  reservation: {
    id: string;
    amount: number;
  };
  vendor: {
    document: string;
    firstName: string;
    lastName: string;
  };
  paymentsSummary?: {
    id: number;
    amount: number;
    status: StatusPayment;
    createdAt: string;
    reviewedAt: string | null;
    codeOperation: string | null;
    banckName: string | null;
    dateOperation: string | null;
    numberTicket: string | null;
    paymentConfig: string;
  }[];
}