import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';
import { ClientDocumentType } from '../enums/client-document-type.enum';

export class CreateInvoiceDto {
  @IsEnum(DocumentType, { message: 'El tipo de documento no es válido' })
  documentType: DocumentType;

  @IsEnum(ClientDocumentType, { message: 'El tipo de documento del cliente no es válido' })
  clientDocumentType: ClientDocumentType;

  @IsString({ message: 'El número de documento del cliente debe ser un texto' })
  @IsNotEmpty({ message: 'El número de documento del cliente es requerido' })
  clientDocumentNumber: string;

  @IsString({ message: 'El nombre del cliente debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del cliente es requerido' })
  clientName: string;

  @IsString({ message: 'La dirección del cliente debe ser un texto' })
  @IsOptional()
  clientAddress?: string;

  @IsEmail({}, { message: 'El email del cliente no es válido' })
  @IsOptional()
  clientEmail?: string;

  @IsNumber({}, { message: 'El tipo de cambio debe ser un número' })
  @Min(0, { message: 'El tipo de cambio no puede ser negativo' })
  @IsOptional()
  exchangeRate?: number;

  @IsBoolean({ message: 'El campo enviar automáticamente a SUNAT debe ser un booleano' })
  @IsOptional()
  sendAutomaticallyToSunat?: boolean;

  @IsBoolean({ message: 'El campo enviar automáticamente al cliente debe ser un booleano' })
  @IsOptional()
  sendAutomaticallyToClient?: boolean;

  @IsString({ message: 'Las observaciones deben ser un texto' })
  @IsOptional()
  observations?: string;

  @IsString({ message: 'El código único debe ser un texto' })
  @IsOptional()
  uniqueCode?: string;

  @IsString({ message: 'El formato de PDF debe ser un texto' })
  @IsOptional()
  pdfFormat?: string;

  @IsNumber({}, { message: 'El ID del pago debe ser un número' })
  @IsNotEmpty({ message: 'El ID del pago es requerido' })
  paymentId: number;

  @IsNumber({}, { message: 'El ID de la factura relacionada debe ser un número' })
  @IsOptional()
  relatedInvoiceId?: number;

  @IsString({ message: 'El código de motivo de nota debe ser un texto' })
  @IsOptional()
  noteReasonCode?: string;

  @IsString({ message: 'La descripción del motivo de nota debe ser un texto' })
  @IsOptional()
  noteReasonDescription?: string;
}
