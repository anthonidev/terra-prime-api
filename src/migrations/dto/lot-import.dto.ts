import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { CurrencyType } from 'src/project/entities/project.entity';
import { LotStatus } from 'src/project/entities/lot.entity';

export class LotImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del lote es requerido' })
  name: string;

  @IsNumber({}, { message: 'El área debe ser un número' })
  @Min(0, { message: 'El área no puede ser negativa' })
  @Type(() => Number)
  area: number;

  @IsNumber({}, { message: 'El precio del lote debe ser un número' })
  @Min(0, { message: 'El precio del lote no puede ser negativo' })
  @Type(() => Number)
  lotPrice: number;

  @IsNumber({}, { message: 'El precio de urbanización debe ser un número' })
  @Min(0, { message: 'El precio de urbanización no puede ser negativo' })
  @Type(() => Number)
  urbanizationPrice: number;

  @IsEnum(LotStatus, { message: 'El estado del lote debe ser válido' })
  status: LotStatus;

  @IsEnum(CurrencyType, { message: 'La moneda debe ser USD o PEN' })
  currency: CurrencyType;
}
