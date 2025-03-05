import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dto/paginationDto';

export enum LotStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  SOLD = 'Vendido',
  RESERVED = 'Separado',
}

export class FindProjectLotsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  blockId?: string;

  @IsOptional()
  @IsEnum(LotStatus, {
    message: 'El estado debe ser Activo, Inactivo, Vendido o Separado',
  })
  status?: LotStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export interface LotResponseDto {
  id: string;
  name: string;
  area: number;
  lotPrice: number;
  urbanizationPrice: number;
  totalPrice: number;
  status: string;
  blockId: string;
  blockName: string;
  stageId: string;
  stageName: string;
  createdAt: Date;
  updatedAt: Date;
}
