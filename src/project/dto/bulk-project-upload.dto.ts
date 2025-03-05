import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// Enums para validar los datos del Excel
export enum CurrencyType {
  USD = 'USD',
  PEN = 'PEN',
}

export enum LotStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  SOLD = 'Vendido',
  RESERVED = 'Separado',
}

// DTO para cada lote en el Excel
export class LotExcelDto {
  @IsNotEmpty({ message: 'La etapa es requerida' })
  @IsString({ message: 'La etapa debe ser texto' })
  stage: string;

  @IsNotEmpty({ message: 'La manzana es requerida' })
  @IsString({ message: 'La manzana debe ser texto' })
  block: string;

  @IsNotEmpty({ message: 'El lote es requerido' })
  lot: string | number;

  @IsNotEmpty({ message: 'El área es requerida' })
  @IsNumber({}, { message: 'El área debe ser un número' })
  @Min(0.01, { message: 'El área debe ser mayor a 0' })
  area: number;

  @IsNotEmpty({ message: 'El precio del lote es requerido' })
  @IsNumber({}, { message: 'El precio del lote debe ser un número' })
  @Min(0.01, { message: 'El precio del lote debe ser mayor a 0' })
  lotPrice: number;

  @IsNumber(
    {},
    { message: 'El precio de habilitación urbana debe ser un número' },
  )
  @Min(0, {
    message: 'El precio de habilitación urbana debe ser mayor o igual a 0',
  })
  urbanizationPrice: number;

  @IsNotEmpty({ message: 'El estado es requerido' })
  @IsEnum(LotStatus, {
    message: 'El estado debe ser Activo, Inactivo, Vendido o Separado',
  })
  status: LotStatus;
}

// DTO para la información del proyecto en el Excel
export class ProjectExcelDto {
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  @IsString({ message: 'El nombre del proyecto debe ser texto' })
  name: string;

  @IsNotEmpty({ message: 'La moneda es requerida' })
  @IsEnum(CurrencyType, { message: 'La moneda debe ser USD o PEN' })
  currency: CurrencyType;

  // Los lotes serán validados individualmente
  lots: LotExcelDto[];
}

// DTO para la validación del archivo Excel
export class ValidateExcelDto {
  // No necesita propiedades, el archivo se recibe como multipart/form-data
}

// Respuesta de validación del Excel
export interface ExcelValidationError {
  row: number;
  column: string;
  message: string;
}

export interface ValidateExcelResponseDto {
  isValid: boolean;
  errors?: ExcelValidationError[];
  data?: ProjectExcelDto;
}

// DTO para crear el proyecto a partir de los datos validados
export class CreateBulkProjectDto {
  @IsNotEmpty({ message: 'Los datos del proyecto son requeridos' })
  projectData: ProjectExcelDto;
}
