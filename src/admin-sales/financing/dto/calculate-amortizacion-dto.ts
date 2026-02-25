// src/admin-sales/financing/dto/calculate-amortization.dto.ts
import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InterestRateSectionDto } from './interest-rate-section.dto';
import { ParkingAmortizationInputDto } from './parking-amortization-input.dto';

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

  @IsArray({ message: 'Las secciones de interés deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => InterestRateSectionDto)
  interestRateSections: InterestRateSectionDto[];

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

  // Parkings - Opcionales (igual que HU)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParkingAmortizationInputDto)
  parkings?: ParkingAmortizationInputDto[];
}
