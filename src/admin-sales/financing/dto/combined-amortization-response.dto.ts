export class ParkingCombinedInstallmentDto {
  parkingIndex: number;
  amount: number | null;
  installmentNumber: number | null;
}

export class CombinedInstallmentResponseDto {
  lotInstallmentAmount: number | null;
  lotInstallmentNumber: number | null;
  huInstallmentAmount: number | null;
  huInstallmentNumber: number | null;
  parkingInstallments: ParkingCombinedInstallmentDto[];
  totalParkingInstallmentAmount: number;
  expectedPaymentDate: string;
  totalInstallmentAmount: number;
}

export class ParkingAmortizationMetaDto {
  parkingIndex: number;
  installmentsCount: number;
  totalAmount: number;
}

export class AmortizationMetadataDto {
  lotInstallmentsCount: number;
  lotTotalAmount: number;
  huInstallmentsCount: number;
  huTotalAmount: number;
  parkings: ParkingAmortizationMetaDto[];
  parkingsTotalAmount: number;
  totalInstallmentsCount: number;
  totalAmount: number;
}

export class CombinedAmortizationResponseDto {
  installments: CombinedInstallmentResponseDto[];
  meta: AmortizationMetadataDto;
}
