import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreateClientDto } from "src/admin-sales/clients/dto/create-client.dto";
import { CreateGuarantorDto } from "src/admin-sales/guarantors/dto/create-guarantor.dto";
import { CreateSecondaryClientDto } from "src/admin-sales/secondary-client/dto/create-secondary-client.dto";

export class CreateClientAndGuarantorDto {
  @IsObject({ message: 'Los datos del cliente deben ser un objeto' })
  @ValidateNested() // Valida el DTO anidado
  @Type(() => CreateClientDto) // Necesario para la transformación
  createClient: CreateClientDto;

  @IsOptional()
  @IsObject({ message: 'Los datos del garante deben ser un objeto' })
  @ValidateNested()
  @Type(() => CreateGuarantorDto)
  createGuarantor: CreateGuarantorDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSecondaryClientDto)
  createSecondaryClient: CreateSecondaryClientDto[];
}
