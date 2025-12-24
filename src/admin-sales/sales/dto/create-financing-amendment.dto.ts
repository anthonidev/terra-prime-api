import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export enum AmendmentInstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
}

export class AmendmentInstallmentItemDto {
  @IsNotEmpty({ message: 'El número de cuota es requerido' })
  @IsNumber()
  @Min(1, { message: 'El número de cuota debe ser mayor a 0' })
  numberCuote: number;

  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha válida' })
  dueDate: string;

  @IsNotEmpty({ message: 'El monto de la cuota es requerido' })
  @IsNumber()
  @Min(0, { message: 'El monto de la cuota no puede ser negativo' })
  amount: number;

  @IsOptional()
  @IsEnum(AmendmentInstallmentStatus, { message: 'El estado debe ser PENDING, PAID o EXPIRED' })
  status?: AmendmentInstallmentStatus;
}

export class CreateFinancingAmendmentDto {
  @IsNotEmpty({ message: 'El monto adicional es requerido' })
  @IsNumber()
  additionalAmount: number; // Puede ser positivo o negativo

  @IsArray({ message: 'Las cuotas deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => AmendmentInstallmentItemDto)
  installments: AmendmentInstallmentItemDto[];

  @IsOptional()
  @IsString()
  observation?: string;
}
