import { IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";
import { DocumentType } from "src/lead/enums/document-type.enum";

export class CreateGuarantorDto {
  @IsString({ message: 'El nombre es una cadena de caracteres' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @IsString({ message: 'El apellido es una cadena de caracteres' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @IsEmail({}, { message: 'El email es un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsNumberString({}, { message: 'El documento debe ser un número válido' })
  @IsNotEmpty({ message: 'El documento es requerido' })
  document: string;

  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser un valor válido',
  })
  @IsOptional()
  documentType?: DocumentType;

  @IsString({ message: 'El teléfono es una cadena de caracteres' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  phone: string;

  @IsString({ message: 'La dirección es una cadena de caracteres' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;
}