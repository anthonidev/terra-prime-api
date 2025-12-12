import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de items por página',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
    default: 10,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiProperty({
    description: 'Orden de los resultados',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
