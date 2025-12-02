import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LeadImportDto } from './lead-import.dto';

export class ClientImportDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LeadImportDto)
  lead: LeadImportDto;

  @IsOptional()
  @IsString()
  address?: string;
}
