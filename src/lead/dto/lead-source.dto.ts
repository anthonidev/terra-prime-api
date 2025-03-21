import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateLeadSourceDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}
export class UpdateLeadSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
