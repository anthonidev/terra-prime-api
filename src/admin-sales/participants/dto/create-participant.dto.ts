import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, Length, Matches } from 'class-validator';
import { ParticipantType } from '../entities/participant.entity';
import { DocumentType } from 'src/lead/enums/document-type.enum';

export class CreateParticipantDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  firstName: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @Length(2, 100, { message: 'El apellido debe tener entre 2 y 100 caracteres' })
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  @Length(0, 35, { message: 'El correo debe tener máximo 35 caracteres' })
  email?: string;

  @IsString({ message: 'El documento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @Length(8, 12, { message: 'El documento debe tener entre 8 y 12 caracteres' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo debe contener números' })
  document: string;

  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser válido' })
  documentType: DocumentType;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Length(9, 20, { message: 'El teléfono debe tener entre 9 y 20 caracteres' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'El teléfono solo debe contener números y caracteres válidos' })
  phone: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @Length(5, 70, { message: 'La dirección debe tener entre 5 y 70 caracteres' })
  address: string;

  @IsEnum(ParticipantType, { message: 'El tipo de participante debe ser válido' })
  participantType: ParticipantType;
}