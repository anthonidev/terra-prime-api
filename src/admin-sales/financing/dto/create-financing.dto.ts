import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsUUID } from "class-validator";
import { FinancingType } from "../enums/financing-type.enum";
import { CreateFinancingInstallmentsDto } from "./create-financing-installments.dto";

export class CreateFinancingDto {

  @IsNotEmpty({ message: 'El  tipo de financiación es requerido' })
  @IsEnum(FinancingType, {
    message: 'El tipo de financiación debe ser un valor válido (DEBITO o CREDITO)',
  })
  financingType: FinancingType;

  @IsNotEmpty({ message: 'El monto inicial de la financiación es requerido' })
  @IsNumber({}, { message: 'El monto inicial de la financiación debe ser un número' })
  initialAmount: number;

  @IsNotEmpty({ message: 'La fecha de pago inicial es requerida' })
  @IsDateString({}, { message: 'La fecha de pago inicial debe ser válida' })
  initialPaymentDate: string;

  @IsNotEmpty({ message: 'El interes porcentual es requerido' })
  @IsNumber({}, { message: 'El interes porcentual debe ser un número' })
  interestRate: number;

  @IsNotEmpty({ message: 'La cantidad de cuotas de financiación es requerida' })
  @IsNumber({}, { message: 'La cantidad de cuotas de financiación debe ser un número' })
  quantityCoutes: number;

  financingInstallments: CreateFinancingInstallmentsDto[];

  // @IsNotEmpty({ message: 'El identificador de la refinanciación es requerido' })
  // @IsUUID('4', { message: 'El identificador de la refinanciación debe ser un UUID válido' })
  // refinancingId: string;
}
