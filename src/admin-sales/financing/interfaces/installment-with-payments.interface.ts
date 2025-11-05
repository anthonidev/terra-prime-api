import { PaymentContribution } from "./payment-contribution.interface";

export interface InstallmentWithPayments {
  id: string;
  couteAmount: number;
  coutePaid: number;
  coutePending: number;
  expectedPaymentDate: string;
  lateFeeAmountPending: number;
  lateFeeAmountPaid: number;
  status: string;
  payments: PaymentContribution[];
}