import { PaymentContribution } from "./payment-contribution.interface";

export interface InstallmentWithPayments {
  id: string;
  couteAmount: number;
  coutePaid: number;
  coutePending: number;
  expectedPaymentDate: Date;
  lateFeeAmountPending: number;
  lateFeeAmountPaid: number;
  status: string;
  payments: PaymentContribution[];
}