import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UpdatePriceByVendorDto {
  @IsString( { message: 'El token ingresado no es válido' })
  @IsNotEmpty({ message: 'El token ingresado es requerido' })
  token: string;

  @IsNumber({}, { message: 'El precio ingresado no es válido' })
  @IsNotEmpty({ message: 'El precio ingresado es requerido' })
  newLotPrice: number;
}