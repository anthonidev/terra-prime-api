import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsEmail,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '../enums/document-type.enum';

export class LeadExcelDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  firstName: string;

  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString()
  @MaxLength(100, {
    message: 'El apellido no puede tener más de 100 caracteres',
  })
  lastName: string;

  @IsNotEmpty({ message: 'El documento es requerido' })
  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document: string;

  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser DNI, CE o RUC',
  })
  documentType: DocumentType;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'La edad mínima es 18 años' })
  @Max(120, { message: 'La edad máxima es 120 años' })
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las observaciones no pueden tener más de 500 caracteres',
  })
  observations?: string;
}

export class BulkLeadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadExcelDto)
  leads: LeadExcelDto[];
}

export interface ExcelValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ValidateBulkLeadResponseDto {
  isValid: boolean;
  errors?: ExcelValidationError[];
  totalLeads: number;
  data?: any;
}

export class CreateBulkLeadDto {
  @IsNotEmpty({ message: 'Los datos de leads son requeridos' })
  leadsData: BulkLeadDto;
}
