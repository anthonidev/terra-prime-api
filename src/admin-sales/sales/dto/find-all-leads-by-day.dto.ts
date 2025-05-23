import { IsDateString, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationDto } from "src/common/dto/paginationDto";

export class FindAllLeadsByDayDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  day?: string;
}
