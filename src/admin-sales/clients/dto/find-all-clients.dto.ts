import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { Transform, Type } from 'class-transformer';

export class FindAllClientsDto extends PaginationDto {
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
  @IsString()
  term?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
