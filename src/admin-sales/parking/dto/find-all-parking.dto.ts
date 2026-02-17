import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LotStatus } from 'src/project/entities/lot.entity';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { CreateParkingResponseDto } from './create-parking.dto';

export class FindAllParkingResponseDto extends CreateParkingResponseDto {}

export class FindAllParkingDto extends PaginationDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasPagination?: boolean = true;
}
