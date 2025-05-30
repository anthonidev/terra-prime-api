import { plainToInstance, Transform, Type } from "class-transformer";
import { IsArray, IsNotEmpty, ValidateNested } from "class-validator";
import { CreateDetailPaymentDto } from "src/admin-payments/payments/dto/create-detail-payment.dto";

export class CreatePaymentSaleDto {
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