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
  IsUUID,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsObject,
  IsNotEmptyObject,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '../enums/document-type.enum';
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

  @IsArray({ message: 'Los proyectos de interés es un array' })
  @IsString({ each: true })
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
    return value;
  })
  interestProjects: string[];

  @IsString({ message: 'El nombre del acompañante es una cadena de texto' })
  @MaxLength(200, { message: 'El nombre del acompañante no puede tener más de 200 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]*$/, {
    message: 'El nombre del acompañante solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'El nombre del acompañante es requerido' })
  companionFullName: string;

  @IsString({ message: 'El DNI del acompañante es una cadena de texto' })
  @MaxLength(20, { message: 'El DNI del acompañante no puede tener más de 20 caracteres' })
  @IsNotEmpty({ message: 'El DNI del acompañante es requerido' })
  companionDni: string;

  @IsString({ message: 'La relación del acompañante es una cadena de texto' })
  @MaxLength(50, { message: 'El parentesco no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'La relación del acompañante es requerida' })
  companionRelationship: string;

  @IsObject({ message: 'Los metadatos son un objeto' })
  @IsNotEmptyObject({}, { message: 'Los metadatos no pueden estar vacíos' })
  metadata: Record<string, any>;


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
