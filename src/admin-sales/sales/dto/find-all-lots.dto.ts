import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/paginationDto";
import { LotStatus } from "src/project/entities/lot.entity";

export class FindAllLotsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(LotStatus, { message: 'El estado debe ser Activo, Inactivo, Vendido o Separado' })
  status?: LotStatus;
}