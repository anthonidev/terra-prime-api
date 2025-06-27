import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class CreateViewDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El código es requerido' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El código no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La URL no puede tener más de 200 caracteres' })
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El icono no puede tener más de 50 caracteres' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'El icono solo debe contener letras, números y guiones',
  })
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  parent?: string; // Código del padre

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateViewDto)
  children?: CreateViewDto[];
}

export class AssignRoleViewsDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del rol es requerido' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateViewDto)
  views: CreateViewDto[];
}
