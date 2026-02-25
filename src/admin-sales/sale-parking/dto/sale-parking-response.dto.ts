import { StatusUrbanDevelopment } from 'src/admin-sales/urban-development/enums/status-urban-development.enum';

export class SaleParkingFinancingInstallmentDto {
  id: string;
  numberCuote: number;
  couteAmount: number;
  coutePending: number;
  coutePaid: number;
  expectedPaymentDate: string;
  status: string;
}

export class SaleParkingFinancingResponseDto {
  id: string;
  initialAmount: number;
  initialAmountPaid: number;
  initialAmountPending: number;
  interestRate: number;
  interestRateSections: Array<{ startInstallment: number; endInstallment: number; interestRate: number }> | null;
  quantityCoutes: number;
  totalCouteAmount: number;
  totalPaid: number;
  totalPending: number;
  installments: SaleParkingFinancingInstallmentDto[];
}

export class SaleParkingResponseDto {
  id: string;
  parkingId: string;
  parkingName: string;
  amount: number;
  initialAmount: number;
  status: StatusUrbanDevelopment;
  financing: SaleParkingFinancingResponseDto;
  createdAt: Date;
}
