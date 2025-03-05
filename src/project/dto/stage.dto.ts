import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para crear una etapa
 */
export class CreateStageDto {
  @IsNotEmpty({ message: 'El nombre de la etapa es requerido' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
    message: 'El nombre solo debe contener letras, números, espacios y guiones',
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsNotEmpty({ message: 'El ID del proyecto es requerido' })
  @IsUUID('all', { message: 'El ID del proyecto debe ser un UUID válido' })
  projectId: string;
}

/**
 * DTO para actualizar una etapa
 */
export class UpdateStageDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
    message: 'El nombre solo debe contener letras, números, espacios y guiones',
  })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para la respuesta de una etapa
 */
export interface StageResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  projectId: string;
  projectName: string;
  blockCount: number;
  lotCount: number;
  createdAt: Date;
  updatedAt: Date;
}
