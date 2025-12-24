import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class InstallmentItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty({ message: 'El número de cuota es requerido' })
  @IsNumber()
  @Min(1, { message: 'El número de cuota debe ser mayor a 0' })
  numberCuote: number;

  @IsNotEmpty({ message: 'El monto de la cuota es requerido' })
  @IsNumber()
  @IsPositive({ message: 'El monto de la cuota debe ser positivo' })
  couteAmount: number;

  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha válida' })
  expectedPaymentDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El monto de mora no puede ser negativo' })
  lateFeeAmount?: number;
}

export class UpdateFinancingInstallmentsDto {
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'El monto total debe ser positivo' })
  newTotalAmount?: number;

  @IsArray({ message: 'Las cuotas deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => InstallmentItemDto)
  installments: InstallmentItemDto[];
}
