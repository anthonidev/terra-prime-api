import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { Transform } from 'class-transformer';

export class FindAllClientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
