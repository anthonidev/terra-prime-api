import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';
export class FindLeadByDocumentDto {
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o CE' })
  documentType: DocumentType;
  @IsNotEmpty({ message: 'El número de documento es requerido' })
  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document: string;
}
