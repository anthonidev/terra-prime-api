import { StatusFinancingInstallments } from "src/admin-sales/financing/enums/status-financing-installments.enum";
import { StatusPayment } from "src/admin-payments/payments/enums/status-payments.enum";

interface PaymentSummary {
  id: number;
  amount: number;
  status: StatusPayment;
  createdAt: string;
  reviewedAt: string;
  codeOperation: string;
  banckName: string;
  dateOperation: string;
  numberTicket: string;
  paymentConfig: string;
  reason: string;
  metadata: Record<string, any>;
}

export interface SaleDetailCollectionResponse {
  client: {
    id: number;
    address: string;
    firstName: string;
    lastName: string;
    phone: string;
    document: string;
    documentType: string;
    age: number;
    ubigeo: {
      departamento: string;
      provincia: string | null;
      distrito: string | null;
    } | null;
    reportPdfUrl: string | null;
  };
  sale: {
    id: string;
    type: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    reservationAmount: string | null;
    maximumHoldPeriod: number | null;
    fromReservation: boolean;
    currency: string;
    guarantor: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      documentType: string;
      document: string;
    } | null;
    secondaryClients: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      documentType: string;
      document: string;
    }[] | null;
    lot: {
      id: string;
      name: string;
      lotPrice: string;
      block: string;
      stage: string;
      project: string;
    };
    radicationPdfUrl: string | null;
    paymentAcordPdfUrl: string | null;
    financing: {
      id: string;
      initialAmount: string;
      interestRate: string;
      quantityCoutes: string;
      financingInstallments: {
        id: string;
        couteAmount: string;
        coutePaid: number;
        coutePending: string;
        expectedPaymentDate: string;
        lateFeeAmountPending: string;
        lateFeeAmountPaid: number;
        status: StatusFinancingInstallments;
      }[];
    } | null;
    urbanDevelopment?: {
      id: number;
      amount: string;
      initialAmount: string;
      status: string;
      financing: {
        id: string;
        initialAmount: string;
        interestRate: string;
        quantityCoutes: string;
        financingInstallments: {
          id: string;
          couteAmount: string;
          coutePaid: number;
          coutePending: string;
          expectedPaymentDate: string;
          lateFeeAmountPending: string;
          lateFeeAmountPaid: number;
          status: StatusFinancingInstallments;
        }[];
      };
    };
    vendor: {
      document: string;
      firstName: string;
      lastName: string;
    };
  };
  paymentsSummary: PaymentSummary[];
}