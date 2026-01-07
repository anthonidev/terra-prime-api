import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { IgvType } from '../enums/igv-type.enum';

export class CreateInvoiceItemDto {
  @IsString({ message: 'La unidad de medida debe ser un texto' })
  @IsNotEmpty({ message: 'La unidad de medida es requerida' })
  unitOfMeasure: string;

  @IsString({ message: 'El código debe ser un texto' })
  @IsOptional()
  code?: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  quantity: number;

  @IsNumber({}, { message: 'El valor unitario debe ser un número' })
  @Min(0, { message: 'El valor unitario no puede ser negativo' })
  unitValue: number;

  @IsNumber({}, { message: 'El descuento debe ser un número' })
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @IsOptional()
  discount?: number;

  @IsEnum(IgvType, { message: 'El tipo de IGV no es válido' })
  igvType: IgvType;
}
