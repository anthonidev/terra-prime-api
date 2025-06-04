import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";
import { Entity } from "typeorm";

@Entity()
export class CreateReservationDto {
  @IsNotEmpty({ message: 'El campo del monto de reserva no puede estar vacío' })
  @IsNumber({}, { message: 'El monto de reserva debe ser un número' })
  @Min(1, { message: 'El monto de reserva debe ser mayor o igual a 1' })
  amount: number;

  @IsNotEmpty({ message: 'El campo del cliente no puede estar vacío' })
  @IsNumber({}, { message: 'El cliente debe ser un número' })
  clientId: number;

  @IsNotEmpty({ message: 'El campo del lote no puede estar vacío' })
  @IsUUID('4', { message: 'El lote debe ser un UUID v4' })
  lotId: string;

  @IsNotEmpty({ message: 'El campo del periodo máximo de reserva no puede estar vacío' })
  @IsNumber({}, { message: 'El periodo máximo de reserva debe ser un número' })
  @Min(1, { message: 'El periodo máximo de reserva debe ser mayor o igual a 1' })
  maximumHoldPeriod: number;
}
