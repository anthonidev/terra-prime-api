import { IsNotEmpty, IsString } from "class-validator";

export class CompletePaymentDto {

  @IsString()
  @IsNotEmpty({ message: 'El código de operación es requerido' })
  codeOperation?: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de ticket es requerido' })
  numberTicket?: string;
}