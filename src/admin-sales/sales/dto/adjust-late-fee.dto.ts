import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LateFeeAction } from 'src/admin-sales/financing/enums/late-fee-action.enum';

export class AdjustLateFeeDto {
  @IsEnum(LateFeeAction, { message: 'La acción debe ser ADD o REMOVE' })
  @IsNotEmpty({ message: 'La acción es requerida' })
  action: LateFeeAction;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  @IsNotEmpty({ message: 'El monto es requerido' })
  @Type(() => Number)
  amount: number;
}
