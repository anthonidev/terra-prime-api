import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { SaleType } from "../enums/sale-type.enum";
import { plainToInstance, Transform, Type } from "class-transformer";
import { MethodPayment } from "src/admin-payments/payments/enums/method-payment.enum";
import { CreateDetailPaymentDto } from "src/admin-payments/payments/dto/create-detail-payment.dto";
import { CreateFinancingInstallmentsDto } from "src/admin-sales/financing/dto/create-financing-installments.dto";

export class CreateSaleDto {
	@IsUUID('4', { message: 'El identificador del lote tiene que ser un UUID válido' })
	@IsNotEmpty({ message: 'El identificador del lote es requerido' })
  lotId: string;

	@IsEnum(SaleType, {
			message: 'El tipo de venta debe ser un valor válido',
	})
	@IsNotEmpty({ message: 'El tipo de venta es requerido' })
  saleType: SaleType;

	@IsNumber({}, { message: 'El identificador del cliente debe ser un número válido' })
	@IsNotEmpty({ message: 'El identificador del cliente es requerido' })
  clientId: number;

	@IsNumber({}, { message: 'El identificador del garante debe ser un número válido' })
	@IsOptional()
	guarantorId?: number;

	@IsArray()
	@IsOptional()
	@Type(() => Number) 
	secondaryClientsIds?: number[];

	@IsDateString({}, { message: 'La fecha de pago debe ser válida' })
	@IsNotEmpty({ message: 'La fecha de pago es requerida' })
  paymentDate: string;

	@IsDateString({}, { message: 'La fecha de venta debe ser válida' })
	@IsNotEmpty({ message: 'La fecha de venta es requerida' })
	saleDate: string;

	@IsDateString({}, { message: 'La fecha de contrato debe ser válida' })
	@IsOptional()
  contractDate?: string;

	@IsNumber({}, { message: 'El monto total debe ser un número válido' })
	@IsNotEmpty({ message: 'El monto total es requerido' })
	@Min(1, { message: 'El monto total no puede ser negativo o cero' })
	totalAmount: number;

	// HU
	@IsNumber({}, { message: 'El monto total de la habilitación urbana debe ser un número válido' })
	@IsNotEmpty({ message: 'El monto total de la habilitación urbana es requerida' })
	@Min(0, { message: 'El monto total de la habilitación urbana no puede ser negativo' })
	totalAmountUrbanDevelopment: number;

	@IsDateString({}, { message: 'La fecha de pago inicial de la habilitación urbana debe ser válida' })
	@IsOptional()
	firstPaymentDateHu?: string;

	@IsOptional()
	@IsNumber({}, { message: 'El monto inicial de la habilitación urbana debe ser un número válido' })
	@Min(0, { message: 'El monto inicial de la habilitación urbana no puede ser negativo' })
	initialAmountUrbanDevelopment?: number = 0;
	
	@IsOptional()
	@IsInt({ message: 'El número de cuotas de la habilitación urbana debe ser un número entero' })
  quantityHuCuotes?: number;

  // Financiado
	@IsOptional()
  initialAmount?: number;

	@IsOptional()
  interestRate?: number;

	@IsOptional()
  quantitySaleCoutes?: number;

	@IsOptional()
  reservationId?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  paymentReference?: string;

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
	@ValidateNested({
			each: true,
			message: 'Cada detalle de pago debe ser un objeto válido',
	})
	@IsOptional()
	@Type(() => CreateDetailPaymentDto)
	payments?: CreateDetailPaymentDto[];

	@IsOptional()
	@IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFinancingInstallmentsDto)
	financingInstallments?: CreateFinancingInstallmentsDto[];
}
