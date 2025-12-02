import { IsNotEmpty, IsString } from "class-validator";

export class CompletePaymentDto {

  @IsString()
  @IsNotEmpty({ message: 'El número de ticket es requerido' })
  numberTicket?: string;
}