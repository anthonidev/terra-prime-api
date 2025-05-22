import {
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
    message: 'El nombre solo debe contener letras, números, espacios y guiones',
  })
  @Transform(({ value }) => value?.trim())
  name?: string;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
  @IsOptional()
  @IsString()
  logoKey?: string | null;
  @IsOptional()
  @IsString()
  logo?: string | null;
}
