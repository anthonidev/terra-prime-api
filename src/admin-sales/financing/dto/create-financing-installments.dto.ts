import { IsDateString, IsNotEmpty, IsNumber } from "class-validator";

export class CreateFinancingInstallmentsDto {
  
  @IsNotEmpty({ message: 'El monto de la cuota de financiación es requerido' })
  @IsNumber({}, { message: 'El monto de la cuota de financiación debe ser un número' })
  couteAmount: number;

  @IsNotEmpty({ message: 'La fecha de pago esperada es requerida' })
  @IsDateString({}, { message: 'La fecha de pago esperada debe ser válida' })
  expectedPaymentDate: String;
}