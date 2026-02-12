import { ArrayMinSize, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class UpdateParkingStatusDto {
  @IsArray({ message: 'Los IDs de cuotas deben ser un array' })
  @IsUUID('4', { each: true, message: 'Cada ID debe ser un UUID válido' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos una cuota' })
  installmentIds: string[];

  @IsBoolean({ message: 'isParked debe ser un valor booleano' })
  isParked: boolean;
}
