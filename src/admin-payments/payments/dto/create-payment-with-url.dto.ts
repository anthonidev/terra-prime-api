import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { MethodPayment } from "../enums/method-payment.enum";
import { CreateDetailPaymentWithUrlDto } from "./create-detail-payment-with-url.dto";

/**
 * DTO para crear un payment cuando ya se tienen las URLs de los archivos
 * (usado para migración de datos)
 */
export class CreatePaymentWithUrlDto {
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
  @Type(() => Number)
  amount: number;

  @IsString({ message: 'El tipo de entidad relacionada es requerido.' })
  @IsNotEmpty({ message: 'El tipo de entidad relacionada es requerido.' })
  relatedEntityType: string;

  @IsString({ message: 'El ID de la entidad relacionada es requerido.' })
  @IsOptional()
  relatedEntityId?: string;

  @IsString({ message: 'El código de venta es requerido para migración.' })
  @IsOptional()
  saleCode?: string;

  @IsArray({ message: 'Los detalles de pago deben ser un array.' })
  @ValidateNested({ each: true })
  @Type(() => CreateDetailPaymentWithUrlDto)
  paymentDetails: CreateDetailPaymentWithUrlDto[];

  @IsOptional()
  metadata?: Record<string, any>;

  @IsDateString({}, { message: 'La fecha de operación debe ser válida' })
  @IsNotEmpty({ message: 'La fecha de operación es requerida' })
  dateOperation: string;

  @IsString()
  @IsOptional()
  numberTicket?: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  userId: string;
}
