import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { DebitNoteType } from '../enums/debit-note-type.enum';

export class CreateDebitNoteDto {
  @IsNumber({}, { message: 'El ID de la factura/boleta original es requerido' })
  @IsNotEmpty({ message: 'El ID de la factura/boleta original es requerido' })
  relatedInvoiceId: number;

  @IsEnum(DebitNoteType, { message: 'El tipo de nota de débito no es válido' })
  @IsNotEmpty({ message: 'El tipo de nota de débito es requerido' })
  debitNoteType: DebitNoteType;

  @IsString({ message: 'La descripción del motivo debe ser un texto' })
  @IsOptional()
  reasonDescription?: string;

  @IsString({ message: 'Las observaciones deben ser un texto' })
  @IsOptional()
  observations?: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsNotEmpty({ message: 'El monto es requerido para notas de débito' })
  amount: number; // Monto adicional a cobrar (intereses, penalidades, etc.)

  @IsString({ message: 'La descripción del cargo debe ser un texto' })
  @IsOptional()
  chargeDescription?: string; // Descripción del cargo adicional
}
