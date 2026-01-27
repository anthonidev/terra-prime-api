import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreditNoteType } from '../enums/credit-note-type.enum';

export class CreateCreditNoteDto {
  @IsNumber({}, { message: 'El ID de la factura/boleta original es requerido' })
  @IsNotEmpty({ message: 'El ID de la factura/boleta original es requerido' })
  relatedInvoiceId: number;

  @IsEnum(CreditNoteType, { message: 'El tipo de nota de crédito no es válido' })
  @IsNotEmpty({ message: 'El tipo de nota de crédito es requerido' })
  creditNoteType: CreditNoteType;

  @IsString({ message: 'La descripción del motivo debe ser un texto' })
  @IsOptional()
  reasonDescription?: string;

  @IsString({ message: 'Las observaciones deben ser un texto' })
  @IsOptional()
  observations?: string;

  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsOptional()
  amount?: number; // Si se especifica, se usa este monto en lugar del total de la factura original
}
