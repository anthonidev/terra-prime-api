import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';

export class PaidInstallmentsDto {
  @IsNotEmpty({ message: 'El ID de la cuota de financiamiento es requerido' })
  @IsNumber({}, { message: 'El monto a pagar debe ser un número válido' })
  @Min(1, { message: 'El monto a pagar debe ser mayor a cero.' })
  @Type(() => Number)
  amountPaid: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? plainToInstance(CreateDetailPaymentDto, parsed)
          : [];
      } catch (error) {
        return [];
      }
    }
    return value;
  })
  @IsArray({ message: 'Los detalles de pago deben ser un arreglo' })
  @ValidateNested({
    each: true,
    message: 'Cada detalle de pago debe ser un objeto válido',
  })
  @IsNotEmpty({ message: 'Los detalles de pago son requeridos' })
  @Type(() => CreateDetailPaymentDto)
  payments: CreateDetailPaymentDto[];
}
