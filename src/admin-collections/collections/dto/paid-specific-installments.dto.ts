import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { PaidSpecificInstallmentDto } from './paid-specific-installment.dto';

export class PaidSpecificInstallmentsDto extends PaidSpecificInstallmentDto {
  @IsArray({ message: 'Los IDs de cuotas deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'Debe enviar al menos un ID de cuota' })
  @IsUUID('4', { each: true, message: 'Cada ID de cuota debe ser un UUID válido' })
  @IsNotEmpty({ message: 'Los IDs de cuotas son requeridos' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  @Type(() => String)
  installmentIds: string[];
}
