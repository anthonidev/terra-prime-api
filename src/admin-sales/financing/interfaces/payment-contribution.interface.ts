export interface PaymentContribution {
  paymentId: number;
  amountApplied: number;
  amountAppliedToLateFee: number;
  amountAppliedToPrincipal: number;
  paymentDate: string;
  paymentStatus: string;
  codeOperation?: string;
  banckName?: string;
  dateOperation?: string;
  numberTicket?: string;
}