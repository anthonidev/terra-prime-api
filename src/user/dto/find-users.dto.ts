import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { ApiProperty } from '@nestjs/swagger';

export class FindUsersDto extends PaginationDto {
  @ApiProperty({
    description: 'Búsqueda por nombre, apellido, email o documento',
    example: 'Juan',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Filtrar por ID de rol',
    example: 1,
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roleId?: number;
}
