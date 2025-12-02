import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';
import { PaymentDetailImportDto } from './payment-detail-import.dto';

export class PaymentByCuoteDto {
  @IsNumber({}, { message: 'El número de cuota debe ser un número' })
  @Min(0, { message: 'El número de cuota no puede ser negativo' })
  @Type(() => Number)
  couteNumber: number;

  @IsNumber({}, { message: 'El ID de configuración de pago debe ser un número' })
  @IsNotEmpty({ message: 'El ID de configuración de pago es requerido' })
  @Type(() => Number)
  paymentConfigId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailImportDto)
  paymentDetails: PaymentDetailImportDto[];
}
