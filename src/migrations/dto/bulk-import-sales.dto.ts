import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { SaleImportDto } from './sale-import.dto';

export class BulkImportSalesDto {
  @IsUUID('4', { message: 'El ID del vendedor debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del vendedor es requerido' })
  vendorId: string;

  @IsArray({ message: 'Las ventas deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => SaleImportDto)
  sales: SaleImportDto[];
}
