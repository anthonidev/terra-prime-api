// Exactamente el mismo formato que CombinedInstallment del cálculo de amortización
export interface CombinedInstallmentWithPayments {
  lotInstallmentAmount: number | null;
  lotInstallmentNumber: number | null;
  huInstallmentAmount: number | null;
  huInstallmentNumber: number | null;
  expectedPaymentDate: string;
  totalInstallmentAmount: number;
}
