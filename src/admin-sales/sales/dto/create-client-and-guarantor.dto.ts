import { Type } from "class-transformer";
import { IsNotEmpty, IsObject, IsString, ValidateNested } from "class-validator";
import { CreateClientDto } from "src/admin-sales/clients/dto/create-client.dto";
import { CreateGuarantorDto } from "src/admin-sales/guarantors/dto/create-guarantor.dto";

export class CreateClientAndGuarantorDto {
  @IsObject({ message: 'Los datos del cliente deben ser un objeto' })
  @ValidateNested() // Valida el DTO anidado
  @Type(() => CreateClientDto) // Necesario para la transformación
  createClient: CreateClientDto;

  @IsObject({ message: 'Los datos del garante deben ser un objeto' })
  @ValidateNested()
  @Type(() => CreateGuarantorDto)
  createGuarantor: CreateGuarantorDto;

  @IsString({ message: 'El documento es una cadena de caracteres' })
  @IsNotEmpty({ message: 'El documento es requerido' })
  document: string;
}
