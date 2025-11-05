// src/admin-sales/financing/dto/calculate-amortization.dto.ts
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateAmortizationDto {
  @IsNotEmpty({ message: 'El monto total de financiación es requerido' })
  @IsNumber({}, { message: 'El monto total de financiación debe ser un número' })
  @Type(() => Number)
  totalAmount: number;

  @IsNotEmpty({ message: 'El monto inicial de financiación es requerido' })
  @IsNumber({}, { message: 'El monto inicial de financiación debe ser un número' })
  @Type(() => Number)
  initialAmount: number;

  @IsOptional()
  @IsNumber({}, { message: 'El monto de reserva debe ser un número' })
  @Type(() => Number)
  reservationAmount?: number = 0;

  @IsNotEmpty({ message: 'El porcentaje de interés es requerido' })
  @IsNumber({}, { message: 'El porcentaje de interés debe ser un número' })
  @Type(() => Number)
  @Min(0, { message: 'El porcentaje de interés debe ser mayor o igual a 0' })
  interestRate: number;

  @IsNotEmpty({ message: 'La cantidad de cuotas es requerido' })
  @IsNumber({}, { message: 'La cantidad de cuotas debe ser un número' })
  @Type(() => Number)
  @Min(1, { message: 'La cantidad de cuotas debe ser mayor a 1' })
  numberOfPayments: number;

  @IsNotEmpty({ message: 'La fecha de pago inicial es requerido' })
  @IsDateString({}, { message: 'La fecha de pago inicial debe ser válida' })
  firstPaymentDate: string;

  @IsBoolean()
  @IsOptional()
  includeDecimals?: boolean;

  // Parámetros para HU (Habilitación Urbana) - Opcionales
  @IsOptional()
  @IsNumber({}, { message: 'El monto total de HU debe ser un número' })
  @Type(() => Number)
  totalAmountHu?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad de cuotas de HU debe ser un número' })
  @Type(() => Number)
  @Min(1, { message: 'La cantidad de cuotas de HU debe ser mayor a 1' })
  numberOfPaymentsHu?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de pago inicial de HU debe ser válida' })
  firstPaymentDateHu?: string;
}
