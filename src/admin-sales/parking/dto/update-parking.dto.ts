import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LotStatus } from 'src/project/entities/lot.entity';
import { CurrencyType } from 'src/project/entities/project.entity';
import { CreateParkingResponseDto } from './create-parking.dto';

export class UpdateParkingResponseDto extends CreateParkingResponseDto {}

export class UpdateParkingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;
}
