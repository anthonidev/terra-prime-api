import { IsDateString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CombinedInstallmentDto {
  @IsOptional()
  @IsNumber({}, { message: 'El monto de la cuota del lote debe ser un número' })
  lotInstallmentAmount?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'El número de cuota del lote debe ser un número' })
  lotInstallmentNumber?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'El monto de la cuota de HU debe ser un número' })
  huInstallmentAmount?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'El número de cuota de HU debe ser un número' })
  huInstallmentNumber?: number | null;

  @IsNotEmpty({ message: 'La fecha de pago esperada es requerida' })
  @IsDateString({}, { message: 'La fecha de pago esperada debe ser válida' })
  expectedPaymentDate: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto total de la cuota debe ser un número' })
  totalInstallmentAmount?: number;
}
