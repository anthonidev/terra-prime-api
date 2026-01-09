import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { CreatePaymentWithUrlDto } from "./create-payment-with-url.dto";

/**
 * DTO para crear múltiples payments en bulk
 * (usado para migración de datos)
 */
export class BulkCreatePaymentsDto {
  @IsArray({ message: 'payments debe ser un array.' })
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentWithUrlDto)
  payments: CreatePaymentWithUrlDto[];
}
