import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/paginationDto';
export class FindUsersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleId?: number;
}
