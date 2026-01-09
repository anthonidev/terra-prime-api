import { CurrencyType } from 'src/project/entities/project.entity';
import { StatusPayment } from 'src/admin-payments/payments/enums/status-payments.enum';

export interface FinancingInstallmentDetail {
  id: string;
  numberCuote: number;
  couteAmount: number;
  coutePending: number;
  coutePaid: number;
  expectedPaymentDate: string;
  lateFeeAmount: number;
  lateFeeAmountPending: number;
  lateFeeAmountPaid: number;
  status: string;
}

export interface FinancingDetail {
  id: string;
  financingType: string;
  initialAmount: number;
  initialAmountPaid: number;
  initialAmountPending: number;
  interestRate: number;
  quantityCoutes: number;
  totalCouteAmount: number;
  totalPaid: number;
  totalPending: number;
  totalLateFee: number;
  totalLateFeeePending: number;
  totalLateFeePaid: number;
  installments: FinancingInstallmentDetail[];
}

export interface SaleWithCombinedInstallmentsResponse {
  id: string;
  type: string;
  totalAmount: number;
  totalAmountPaid?: number;
  totalAmountPending?: number;
  totalToPay?: number;
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
    document: string | null;
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

  // Información de financiamiento con estructura lot y hu
  financing?: {
    lot: FinancingDetail;
    hu?: FinancingDetail;
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
    banckName: string | null;
    dateOperation: string | null;
    numberTicket: string | null;
    paymentConfig: string;
    reason: string | null;
    metadata: Record<string, any>;
  }[];
}
