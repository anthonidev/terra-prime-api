import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DetailPaymentAutoApprovedDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  bankName?: string;

  @IsString()
  @IsNotEmpty({ message: 'La referencia de transacción es requerida' })
  @Transform(({ value }) => value?.trim())
  transactionReference: string;

  @IsString()
  @IsNotEmpty({ message: 'El código de operación es requerido para pagos auto-aprobados' })
  @Transform(({ value }) => value?.trim())
  codeOperation: string;

  @IsDateString({}, { message: 'La fecha de transacción debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de transacción es requerida' })
  transactionDate: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @Min(0, { message: 'El monto no puede ser negativo' })
  @IsNotEmpty({ message: 'El monto del pago es requerido' })
  @Type(() => Number)
  amount: number;

  @IsNumber()
  @IsNotEmpty({ message: 'El índice del archivo es requerido' })
  @Min(0, { message: 'El índice del archivo debe ser al menos 0' })
  @Type(() => Number)
  fileIndex: number;
}

export class PaidInstallmentsAutoApprovedDto {
  @IsNotEmpty({ message: 'El monto a pagar es requerido' })
  @IsNumber({}, { message: 'El monto a pagar debe ser un número válido' })
  @Min(1, { message: 'El monto a pagar debe ser mayor a cero.' })
  @Type(() => Number)
  amountPaid: number;

  @IsDateString({}, { message: 'La fecha de operación debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de operación es requerida' })
  dateOperation: string;

  @IsString()
  @IsOptional()
  numberTicket?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? plainToInstance(DetailPaymentAutoApprovedDto, parsed)
          : [];
      } catch (error) {
        return [];
      }
    }
    return value;
  })
  @IsArray({ message: 'Los detalles de pago deben ser un arreglo' })
  @ValidateNested({
    each: true,
    message: 'Cada detalle de pago debe ser un objeto válido',
  })
  @IsNotEmpty({ message: 'Los detalles de pago son requeridos' })
  @Type(() => DetailPaymentAutoApprovedDto)
  payments: DetailPaymentAutoApprovedDto[];
}
