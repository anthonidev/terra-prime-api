import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CurrencyType } from 'src/project/entities/project.entity';

export class ProjectImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  name: string;

  @IsEnum(CurrencyType, { message: 'La moneda debe ser USD o PEN' })
  @IsNotEmpty({ message: 'La moneda del proyecto es requerida' })
  currency: CurrencyType;
}
