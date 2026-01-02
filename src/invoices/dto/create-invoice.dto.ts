import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';
import { ClientDocumentType } from '../enums/client-document-type.enum';
import { Currency } from '../enums/currency.enum';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @IsEnum(DocumentType, { message: 'El tipo de documento no es válido' })
  documentType: DocumentType;

  @IsString({ message: 'La serie debe ser un texto' })
  @IsNotEmpty({ message: 'La serie es requerida' })
  series: string;

  @IsNumber({}, { message: 'El número debe ser un número' })
  @Min(1, { message: 'El número debe ser mayor a 0' })
  number: number;

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

  @IsEnum(Currency, { message: 'La moneda no es válida' })
  @IsOptional()
  currency?: Currency;

  @IsNumber({}, { message: 'El tipo de cambio debe ser un número' })
  @Min(0, { message: 'El tipo de cambio no puede ser negativo' })
  @IsOptional()
  exchangeRate?: number;

  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

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
