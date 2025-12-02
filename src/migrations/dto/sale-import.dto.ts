import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProjectImportDto } from './project-import.dto';
import { StageImportDto } from './stage-import.dto';
import { BlockImportDto } from './block-import.dto';
import { LotImportDto } from './lot-import.dto';
import { ClientImportDto } from './client-import.dto';
import { SecondaryClientImportDto } from './secondary-client-import.dto';
import { SaleDataImportDto } from './sale-data-import.dto';
import { FinancingImportDto } from './financing-import.dto';
import { PaymentByCuoteDto } from './payment-by-cuote.dto';

export class SaleImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del Excel es requerido' })
  excelCode: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ProjectImportDto)
  project: ProjectImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => StageImportDto)
  stage: StageImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => BlockImportDto)
  block: BlockImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LotImportDto)
  lot: LotImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ClientImportDto)
  client: ClientImportDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SecondaryClientImportDto)
  secondaryClient?: SecondaryClientImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SaleDataImportDto)
  sale: SaleDataImportDto;

  @IsObject()
  @ValidateNested()
  @Type(() => FinancingImportDto)
  financing: FinancingImportDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentByCuoteDto)
  payments: PaymentByCuoteDto[];
}
