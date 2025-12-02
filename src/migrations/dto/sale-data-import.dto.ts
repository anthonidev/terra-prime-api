import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';

export class SaleDataImportDto {
  @IsEnum(SaleType, { message: 'El tipo de venta debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de venta es requerido' })
  saleType: SaleType;

  @IsDateString({}, { message: 'La fecha de contrato debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de contrato es requerida' })
  contractDate: string;

  @IsNumber({}, { message: 'El monto total debe ser un número' })
  @Min(0, { message: 'El monto total no puede ser negativo' })
  @Type(() => Number)
  totalAmount: number;

  @IsOptional()
  @IsNumber({}, { message: 'El monto de reserva debe ser un número' })
  @Min(0, { message: 'El monto de reserva no puede ser negativo' })
  @Type(() => Number)
  reservationAmount?: number;

  @IsNumber({}, { message: 'El monto de habilitación urbana debe ser un número' })
  @Min(0, { message: 'El monto de habilitación urbana no puede ser negativo' })
  @Type(() => Number)
  totalAmountUrbanDevelopment: number;

  @IsBoolean({ message: 'El campo de aplicación de mora debe ser booleano' })
  @Type(() => Boolean)
  applyLateFee: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
