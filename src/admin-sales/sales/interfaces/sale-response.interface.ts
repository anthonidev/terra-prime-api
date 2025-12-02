import { StatusPayment } from "src/admin-payments/payments/enums/status-payments.enum";
import { StatusFinancingInstallments } from "src/admin-sales/financing/enums/status-financing-installments.enum";
import { CurrencyType } from "src/project/entities/project.entity";

export interface SaleResponse {
  id: string;
  type: string;
  totalAmount: number;
  totalAmountPaid?: number;
  totalAmountPending?: number;
  contractDate: string;
  status: string;
  currency: CurrencyType;
  createdAt: string;
  reservationAmount?: number;
  reservationAmountPaid?: number;
  reservationAmountPending?: number;
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
  financing: {
    id: string;
    initialAmount: number;
    initialAmountPaid?: number;
    initialAmountPending?: number;
    interestRate: number;
    quantityCoutes: number;
    // AGREGAR ESTO:
    financingInstallments: {
      id: string;
      couteAmount: number;
      coutePending: number;
      coutePaid: number;
      expectedPaymentDate: string;
      lateFeeAmountPending: number;
      lateFeeAmountPaid: number;
      status: StatusFinancingInstallments;
    }[];
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
      financingInstallments: {
        id: string;
        couteAmount: number;
        coutePending: number;
        coutePaid: number;
        expectedPaymentDate: string;
        lateFeeAmountPending: number;
        lateFeeAmountPaid: number;
        status: StatusFinancingInstallments;
      }[];
    };
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
  // reservation: {
  //   id: string;
  //   amount: number;
  // };
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
    banckName: string | null;
    dateOperation: string | null;
    numberTicket: string | null;
    paymentConfig: string;
    reason: string | null;
  }[];
}