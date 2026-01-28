import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CompletePaymentDto {

  @IsString()
  @IsNotEmpty({ message: 'El número de ticket es requerido' })
  numberTicket: string;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de operación debe ser una fecha válida' })
  dateOperation?: string;
}