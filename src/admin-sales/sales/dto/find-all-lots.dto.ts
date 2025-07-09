import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationDto } from "src/common/dto/paginationDto";
import { LotStatus } from "src/project/entities/lot.entity";

export class FindAllLotsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(LotStatus, { message: 'El estado debe ser Activo, Inactivo, Vendido o Separado' })
  status?: LotStatus;

  @IsOptional()
  @IsString({ message: 'El campo de termino es una cadena de caracteres' })
  term?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de etapa debe ser un UUID válido' })
  stageId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de manzana debe ser un UUID válido' })
  blockId?: string;
}