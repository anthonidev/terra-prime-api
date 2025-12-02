import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentType } from 'src/lead/enums/document-type.enum';

export class LeadImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(100, { message: 'El apellido no puede tener más de 100 caracteres' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'El documento es requerido' })
  @MaxLength(20, { message: 'El documento no puede tener más de 20 caracteres' })
  document: string;

  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI, CE o RUC' })
  documentType: DocumentType;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'La edad mínima es 18 años' })
  @Max(120, { message: 'La edad máxima es 120 años' })
  @Type(() => Number)
  age?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestProjects?: string[];
}
