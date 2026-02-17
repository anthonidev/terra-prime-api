import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LotStatus } from 'src/project/entities/lot.entity';
import { CurrencyType } from 'src/project/entities/project.entity';

export class CreateParkingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  area: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;
}

export class CreateParkingResponseDto {
  id: string;
  name: string;
  area: number;
  price: number;
  status: string;
  currency: string;
  projectId: string;
  projectName: string;
  createdAt: Date;
  updatedAt: Date;
}
