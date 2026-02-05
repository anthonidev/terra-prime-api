import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSaleFileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
