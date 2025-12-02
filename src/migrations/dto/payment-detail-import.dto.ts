import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PaymentDetailImportDto {
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsString()
  @IsNotEmpty({ message: 'La referencia de transacción es requerida' })
  transactionReference: string;

  @IsDateString({}, { message: 'La fecha de transacción debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de transacción es requerida' })
  transactionDate: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'La URL del voucher es requerida' })
  url: string;

  @IsString()
  @IsNotEmpty({ message: 'La clave del voucher es requerida' })
  urlKey: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
