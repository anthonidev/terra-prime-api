import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from "class-validator";

export class CreateSaleWithdrawalDto {
  @IsNotEmpty({ message: 'El ID de venta es obligatorio' })
  @IsUUID('4', { message: 'El ID de venta tiene que ser un UUID' })
  saleId: string;

  @IsNotEmpty({ message: 'El monto de devolución es obligatorio' })
  @IsNumber({}, { message: 'El monto de devolución debe ser un número' })
  @Min(0, { message: 'El monto de devolución debe ser mayor o igual a 0' })
  amount: number;

  @IsNotEmpty({ message: 'La razón de el desestimiento es obligatorio' })
  @IsString({ message: 'La razón de el desestimiento debe ser una cadena de caracteres' })
  reason: string;
}