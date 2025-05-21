import { ArrayNotEmpty, IsArray, IsNotEmpty, IsUUID } from "class-validator";

export class AssignLeadsToVendorDto {
  @IsArray({
    message: 'El campo leadsId debe ser un array'
  })
  @IsUUID('4', {
    message: 'Cada elemento de leadsId debe ser un UUID válido',
    each: true
  })
  @ArrayNotEmpty({ message: 'El campo leadsId no puede estar vacío' })
  leadsId: string[];

  @IsUUID('4', {
    message: 'El campo vendorId debe ser un UUID válido'
  })
  @IsNotEmpty({ message: 'El campo vendorId no puede estar vacío' })
  vendorId: string;
}