import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateClientDto {
  @IsUUID('4', { message: 'El identificador del lead tiene que ser un UUID válido' })
  @IsNotEmpty({ message: 'El identificador del lead es requerido' })
  leadId: string;

  @IsString({ message: 'La dirección es una cadena de caracteres' })
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;
}
