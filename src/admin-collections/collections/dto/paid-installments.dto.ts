import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from "class-validator";
import { CreateDetailPaymentDto } from "src/admin-payments/payments/dto/create-detail-payment.dto";

export class PaidInstallmentsDto {
    @IsNotEmpty({ message: 'El ID de la cuota de financiamiento es requerido' })
    @IsNumber({}, { message: 'El monto a pagar debe ser un número válido' })
    @Min(1, { message: 'El monto a pagar debe ser mayor a cero.' })
    amountPaid: number;
  
    @IsArray({ message: 'Los datos de pago deben ser un array' })
    @ValidateNested({ each: true })
    @Type(() => CreateDetailPaymentDto)
    paymentDetails: CreateDetailPaymentDto[];
}