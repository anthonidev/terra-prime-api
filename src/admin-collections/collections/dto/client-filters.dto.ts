import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/paginationDto';

export class ClientFiltersDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID del departamento debe ser un número entero' })
  departamentoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de la provincia debe ser un número entero' })
  provinciaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID del distrito debe ser un número entero' })
  distritoId?: number;

  @IsOptional()
  @IsString({ message: 'El ID del cobrador debe ser un string' })
  collectorId?: string;

  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser un string' })
  search?: string;
}
