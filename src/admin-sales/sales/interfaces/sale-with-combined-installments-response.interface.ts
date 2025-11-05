import { CurrencyType } from "src/project/entities/project.entity";
import { CombinedInstallmentWithPayments } from "./combined-installment-with-payments.interface";
import { StatusPayment } from "src/admin-payments/payments/enums/status-payments.enum";
import { AmortizationMetadata } from "src/admin-sales/financing/interfaces/combined-amortization-response.interface";

export interface SaleWithCombinedInstallmentsResponse {
  id: string;
  type: string;
  totalAmount: number;
  contractDate: string;
  status: string;
  currency: CurrencyType;
  createdAt: string;
  reservationAmount?: number;
  maximumHoldPeriod?: number;
  fromReservation?: boolean;
  client: {
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
    reportPdfUrl: string | null;
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
    block: string;
    stage: string;
    project: string;
  };
  radicationPdfUrl: string | null;
  paymentAcordPdfUrl: string | null;

  // Información de financiamiento combinado
  financing?: {
    id: string;
    lot: {
      id: string;
      initialAmount: number;
      interestRate: number;
      quantityCoutes: number;
    };
    urbanDevelopment?: {
      id: number;
      amount: number;
      initialAmount: number;
      status: string;
      financing?: {
        id: string;
        initialAmount: number;
        interestRate: number;
        quantityCoutes: number;
      };
    };
    installments: CombinedInstallmentWithPayments[];
    meta: AmortizationMetadata;
  };

  guarantor: {
    firstName: string;
    lastName: string;
  };
  liner?: {
    firstName: string;
    lastName: string;
  };
  telemarketingSupervisor?: {
    firstName: string;
    lastName: string;
  };
  telemarketingConfirmer?: {
    firstName: string;
    lastName: string;
  };
  telemarketer?: {
    firstName: string;
    lastName: string;
  };
  fieldManager?: {
    firstName: string;
    lastName: string;
  };
  fieldSupervisor?: {
    firstName: string;
    lastName: string;
  };
  fieldSeller?: {
    firstName: string;
    lastName: string;
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
