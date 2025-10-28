import { IsOptional, IsInt, Min, Max, IsNotEmpty, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/paginationDto';

export class CollectorStatisticsFiltersDto extends PaginationDto {
  @ValidateIf((o) => o.year !== undefined)
  @IsNotEmpty({ message: 'El mes es requerido cuando se especifica el año' })
  @Type(() => Number)
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  @IsOptional()
  month?: number;

  @ValidateIf((o) => o.month !== undefined)
  @IsNotEmpty({ message: 'El año es requerido cuando se especifica el mes' })
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2000, { message: 'El año debe ser mayor o igual a 2000' })
  @IsOptional()
  year?: number;
}
