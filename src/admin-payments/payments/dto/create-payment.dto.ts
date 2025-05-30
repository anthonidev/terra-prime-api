import { Transform, Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { MethodPayment } from "../enums/method-payment.enum";
import { CreateDetailPaymentDto } from "./create-detail-payment.dto";

export class CreatePaymentDto {
  @IsEnum(MethodPayment, {
    message: 'El método de pago debe ser VOUCHER',
  })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  methodPayment: MethodPayment;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con hasta 2 decimales' },
  )
  @Min(0, { message: 'El monto no puede ser negativo' })
  @IsNotEmpty({ message: 'El monto del pago es requerido' })
  @Type(() => Number) // Asegura la transformación a número
  amount: number; // El monto total del pago

  @IsString({ message: 'El tipo de entidad relacionada es requerido.' })
  @IsNotEmpty({ message: 'El tipo de entidad relacionada es requerido.' })
  relatedEntityType: string; // Ej: 'sale', 'separation', 'financing_installment'

  @IsString({ message: 'El ID de la entidad relacionada es requerido.' })
  @IsNotEmpty({ message: 'El ID de la entidad relacionada es requerido.' })
  relatedEntityId: string; // El ID de la entidad específica (e.g., ID de la venta, ID de la separación)

  @IsArray({ message: 'Los detalles de pago deben ser un array.' })
  @ValidateNested({ each: true }) // Valida cada objeto dentro del array
  @Type(() => CreateDetailPaymentDto) // Transforma los objetos planos a instancias de PaymentDetailDto
  paymentDetails: CreateDetailPaymentDto[]; // Contiene los detalles de cada voucher/comprobante

  @IsOptional()
  metadata?: Record<string, any>;

}