// src/admin-sales/financing/interfaces/combined-amortization-response.interface.ts

export interface CombinedInstallment {
  lotInstallmentAmount: number | null; // Monto de la cuota del lote
  lotInstallmentNumber: number | null; // Número de cuota del lote
  huInstallmentAmount: number | null; // Monto de la cuota de HU
  huInstallmentNumber: number | null; // Número de cuota de HU
  expectedPaymentDate: string; // Fecha de pago en formato YYYY-MM-DD
  totalInstallmentAmount: number; // Suma de lotInstallmentAmount + huInstallmentAmount
}

export interface AmortizationMetadata {
  lotInstallmentsCount: number;
  lotTotalAmount: number;
  huInstallmentsCount: number;
  huTotalAmount: number;
  totalInstallmentsCount: number; // Total de filas en el array
  totalAmount: number; // Suma de lote + HU
}

export interface CombinedAmortizationResponse {
  installments: CombinedInstallment[];
  meta: AmortizationMetadata;
}
