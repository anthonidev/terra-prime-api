import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/paginationDto';

export class ClientFiltersDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de ubigeo debe ser un número entero' })
  ubigeoId?: number;
}
