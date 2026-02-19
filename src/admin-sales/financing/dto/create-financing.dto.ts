import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { FinancingType } from "../enums/financing-type.enum";
import { CreateFinancingInstallmentsDto } from "./create-financing-installments.dto";
import { InterestRateSectionDto } from "./interest-rate-section.dto";

export class CreateFinancingDto {

  @IsNotEmpty({ message: 'El  tipo de financiación es requerido' })
  @IsEnum(FinancingType, {
    message: 'El tipo de financiación debe ser un valor válido (DEBITO o CREDITO)',
  })
  financingType: FinancingType;

  @IsNotEmpty({ message: 'El monto inicial de la financiación es requerido' })
  @IsNumber({}, { message: 'El monto inicial de la financiación debe ser un número' })
  initialAmount: number;

  @IsArray({ message: 'Las secciones de interés deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => InterestRateSectionDto)
  interestRateSections: InterestRateSectionDto[];

  // Campo calculado internamente por el service (promedio ponderado de secciones)
  interestRate?: number;

  @IsNotEmpty({ message: 'La cantidad de cuotas de financiación es requerida' })
  @IsNumber({}, { message: 'La cantidad de cuotas de financiación debe ser un número' })
  quantityCoutes: number;

  financingInstallments: CreateFinancingInstallmentsDto[];
}
