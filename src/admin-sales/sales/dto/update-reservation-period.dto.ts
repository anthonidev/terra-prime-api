import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateReservationPeriodDto {
  @IsNotEmpty({ message: 'Los días adicionales son obligatorios' })
  @IsNumber({}, { message: 'Los días adicionales deben ser un número' })
  @Min(1, { message: 'Los días adicionales deben ser mayor a 0' })
  additionalDays: number;
}

export class UpdateReservationPeriodResponseDto {
  saleId: string;
  previousPeriod: number;
  newPeriod: number;
  newExpirationDate: string;
  message: string;
}