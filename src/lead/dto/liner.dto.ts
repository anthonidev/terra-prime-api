import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '../enums/document-type.enum';
export class CreateLinerDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString()
  @MaxLength(100, {
    message: 'El apellido no puede tener más de 100 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @IsNotEmpty({ message: 'El documento es requerido' })
  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document: string;
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o CE' })
  documentType: DocumentType;
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
export class UpdateLinerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'El apellido no puede tener más de 100 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document?: string;
  @IsOptional()
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o CE' })
  documentType?: DocumentType;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
