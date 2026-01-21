import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnnulInvoiceDto {
  @IsString({ message: 'El motivo de anulación debe ser un texto' })
  @IsNotEmpty({ message: 'El motivo de anulación es requerido' })
  reason: string;

  @IsString({ message: 'El código único debe ser un texto' })
  @IsOptional()
  codigo_unico?: string;
}
