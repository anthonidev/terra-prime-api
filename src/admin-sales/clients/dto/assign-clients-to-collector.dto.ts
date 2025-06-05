import { IsArray, IsNotEmpty, IsNumber, IsUUID } from "class-validator";

export class AssignClientsToCollectorDto {
  @IsArray({ message: 'Los ID de clientes deben estar en un array' })
  @IsNumber ( {}, { each: true, message: 'Los ID de clientes deben ser números' })
  clientsId: number[];

  @IsUUID('4', {
    message: 'El campo del ID del cobrador debe ser un UUID válido'
  })
  @IsNotEmpty({ message: 'El campo del ID del cobrador no puede estar vacío' })
  collectorId: string;
}
