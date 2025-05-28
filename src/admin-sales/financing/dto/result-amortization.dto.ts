import { CreateFinancingInstallmentsDto } from "./create-financing-installments.dto";

export class ResultAmortizationDto {
  installments: CreateFinancingInstallmentsDto[];
  meta: {
    totalCouteAmountSum: number;
  };
}