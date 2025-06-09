import { StatusPayment } from "src/admin-payments/payments/enums/status-payments.enum";
import { CurrencyType } from "src/project/entities/project.entity";

export interface SaleResponse {
  id: string;
  type: string;
  totalAmount: number;
  contractDate: string;
  status: string;
  currency: CurrencyType;
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
    reason: string | null;
  }[];
}