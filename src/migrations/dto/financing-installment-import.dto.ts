import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class FinancingInstallmentImportDto {
  @IsNumber({}, { message: 'El número de cuota debe ser un número' })
  @Min(0, { message: 'El número de cuota no puede ser negativo' })
  @Type(() => Number)
  couteNumber: number;

  @IsNumber({}, { message: 'El monto de la cuota debe ser un número' })
  @Min(0, { message: 'El monto de la cuota no puede ser negativo' })
  @Type(() => Number)
  couteAmount: number;

  @IsDateString({}, { message: 'La fecha de vencimiento debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  expectedPaymentDate: string;

  @IsNumber({}, { message: 'El monto de mora debe ser un número' })
  @Min(0, { message: 'El monto de mora no puede ser negativo' })
  @Type(() => Number)
  lateFeeAmount: number;
}
