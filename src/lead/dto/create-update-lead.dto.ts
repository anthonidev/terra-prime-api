import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  Matches,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DocumentType } from '../enums/document-type.enum';

export class CompanionDto {
  @IsString({ message: 'El nombre del acompañante es una cadena de texto' })
  @MaxLength(200, { message: 'El nombre del acompañante no puede tener más de 200 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El nombre del acompañante solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsOptional()
  @IsString({ message: 'El DNI del acompañante es una cadena de texto' })
  @MaxLength(20, { message: 'El DNI del acompañante no puede tener más de 20 caracteres' })
  dni?: string;

  @IsOptional()
  @IsString({ message: 'El parentesco del acompañante es una cadena de texto' })
  @MaxLength(50, { message: 'El parentesco no puede tener más de 50 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El parentesco solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  relationship?: string;
}

export class CreateUpdateLeadDto {
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsString()
  @MaxLength(100, {
    message: 'El apellido no puede tener más de 100 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document: string;

  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o CE' })
  documentType: DocumentType;

  @IsOptional()
  @IsArray({ message: 'Los proyectos de interés es un array' })
  @IsString({ each: true, message: 'each value in interestProjects must be a string' })
  @ArrayMaxSize(10, { message: 'No se pueden agregar más de 10 proyectos de interés' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  interestProjects?: string[];

  // Acompañantes - array de objetos, verdaderamente opcional
  @IsOptional()
  @IsArray({ message: 'Los acompañantes deben ser un array' })
  @ValidateNested({ each: true, message: 'Cada acompañante debe ser un objeto válido' })
  @Type(() => CompanionDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return Array.isArray(value) ? value : undefined;
  })
  companions?: CompanionDto[];

  // Metadata - Verdaderamente opcional
  @ValidateIf((obj) => obj.metadata !== undefined && obj.metadata !== null)
  @IsObject({ message: 'Los metadatos son un objeto' })
  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{6,15}$/, {
    message: 'El teléfono debe ser un número válido',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{6,15}$/, {
    message: 'El teléfono alternativo debe ser un número válido',
  })
  phone2?: string;

  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'La edad mínima es 18 años' })
  @Max(120, { message: 'La edad máxima es 120 años' })
  age?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  sourceId?: number;

  @IsOptional()
  @IsNumber()
  ubigeoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las observaciones no pueden tener más de 500 caracteres',
  })
  observations?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isNewLead?: boolean;
}
