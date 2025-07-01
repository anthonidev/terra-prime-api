import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

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

export class LotExcelDto {
  @IsNotEmpty({ message: 'La etapa es requerida' })
  @IsString({ message: 'La etapa debe ser texto' })
  stage: string;

  @IsNotEmpty({ message: 'La manzana es requerida' })
  @IsString({ message: 'La manzana debe ser texto' })
  block: string;

  @IsNotEmpty({ message: 'El lote es requerido' })
  lot: string;

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

export class ProjectExcelDto {
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  @IsString({ message: 'El nombre del proyecto debe ser texto' })
  name: string;

  @IsNotEmpty({ message: 'La moneda es requerida' })
  @IsEnum(CurrencyType, { message: 'La moneda debe ser USD o PEN' })
  currency: CurrencyType;

  lots: LotExcelDto[];
}

export class ValidateExcelDto {
  // Clase vacía para futuras extensiones
}

export interface ExcelValidationError {
  row: number;
  column: string;
  message: string;
}

// 🔥 NUEVA INTERFAZ: Información detallada sobre duplicados
export interface DuplicateSummary {
  stage: string;
  block: string;
  lot: string;
  count: number;
  rows: number[];
  prices: number[];
}

export interface ValidationSummary {
  totalLots: number;
  duplicateGroups: number;
  totalDuplicates: number;
  duplicateDetails: DuplicateSummary[];
  formatErrors: number;
  validationErrors: number;
}

export interface ValidateExcelResponseDto {
  isValid: boolean;
  errors?: ExcelValidationError[];
  data?: ProjectExcelDto;
  // 🔥 NUEVOS CAMPOS: Resumen de validación
  summary?: ValidationSummary;
  message?: string;
}

export class CreateBulkProjectDto {
  @IsNotEmpty({ message: 'Los datos del proyecto son requeridos' })
  projectData: ProjectExcelDto;
}
