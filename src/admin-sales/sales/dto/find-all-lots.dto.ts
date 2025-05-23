import { IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/paginationDto";
import { LotStatus } from "src/project/entities/lot.entity";

export class FindAllLotsDto extends PaginationDto {
  @IsOptional()
  status?: LotStatus;
}