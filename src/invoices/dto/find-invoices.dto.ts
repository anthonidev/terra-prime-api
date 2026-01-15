import { IsDateString, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';

export class FindInvoicesDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
