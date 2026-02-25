import { IsArray, IsDateString, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InterestRateSectionDto } from './interest-rate-section.dto';

export class ParkingAmortizationInputDto {
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  initialAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterestRateSectionDto)
  interestRateSections: InterestRateSectionDto[];

  @IsDateString()
  firstPaymentDate: string;
}
