import { CreateFinancingInstallmentsDto } from "src/admin-sales/financing/dto/create-financing-installments.dto";

export interface CalculateAmortizationResponse {
  installments: CreateFinancingInstallmentsDto[];
  meta: {
    totalCouteAmountSum: number;
  }
}