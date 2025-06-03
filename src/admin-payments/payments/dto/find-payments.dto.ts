import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { StatusPayment } from '../enums/status-payments.enum';

export class FindPaymentsDto extends PaginationDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paymentConfigId?: number;

  @IsOptional()
  @IsEnum(StatusPayment)
  status?: StatusPayment;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
