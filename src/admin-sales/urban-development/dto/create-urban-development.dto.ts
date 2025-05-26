import { IsNotEmpty, IsNumber, IsUUID } from "class-validator";
import { CreateFinancingInstallmentsDto } from "src/admin-sales/financing/dto/create-financing-installments.dto";

export class CreateUrbanDevelopmentDto {
  @IsNotEmpty({ message: 'El monto de la habilitación urbana es requerido' })
  @IsNumber({}, { message: 'El monto de la habilitación urbana debe ser un número' })
  amount: number;

  @IsNotEmpty({ message: 'El monto de la inicial habilitación urbana es requerido' })
  @IsNumber({}, { message: 'El monto de la inicial habilitación urbana debe ser un número' })
  initialAmount: number;

  @IsNotEmpty({ message: 'El ID de la financiación es requerido' })
  @IsUUID('4', { message: 'El ID de la financiación debe ser un UUID válido' })
  financingId: string;

  @IsNotEmpty({ message: 'El ID de la venta es requerido' })
  @IsUUID('4', { message: 'El ID de la venta debe ser un UUID válido' })
  saleId: string;
}