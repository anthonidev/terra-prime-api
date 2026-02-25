import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterestRateSectionDto } from 'src/admin-sales/financing/dto/interest-rate-section.dto';

export class CreateSaleParkingDto {
  @IsUUID()
  parkingId: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterestRateSectionDto)
  interestRateSections?: InterestRateSectionDto[];

  @IsInt()
  @Min(1)
  quantityCuotes: number;

  @IsDateString()
  firstPaymentDate: string;
}
