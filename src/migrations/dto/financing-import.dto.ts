import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { FinancingType } from 'src/admin-sales/financing/enums/financing-type.enum';
import { FinancingInstallmentImportDto } from './financing-installment-import.dto';

export class FinancingImportDto {
  @IsEnum(FinancingType, { message: 'El tipo de financiamiento debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de financiamiento es requerido' })
  financingType: FinancingType;

  @IsNumber({}, { message: 'El monto inicial debe ser un número' })
  @Min(0, { message: 'El monto inicial no puede ser negativo' })
  @Type(() => Number)
  initialAmount: number;

  @IsOptional()
  @IsNumber({}, { message: 'La tasa de interés debe ser un número' })
  @Min(0, { message: 'La tasa de interés no puede ser negativa' })
  @Type(() => Number)
  interestRate?: number;

  @IsNumber({}, { message: 'El número de cuotas debe ser un número' })
  @Min(1, { message: 'Debe haber al menos 1 cuota' })
  @Type(() => Number)
  quantityCoutes: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinancingInstallmentImportDto)
  installments: FinancingInstallmentImportDto[];
}
