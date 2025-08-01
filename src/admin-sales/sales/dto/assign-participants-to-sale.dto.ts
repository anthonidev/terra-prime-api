import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignParticipantsToSaleDto {
  @IsOptional()
  @IsString({ message: 'El ID del Líner debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  linerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Supervisor de telemarketing debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  telemarketingSupervisorId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Confirmador de telemarketing debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  telemarketingConfirmerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Telemarketer debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  telemarketerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Jefe de campo debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  fieldManagerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Supervisor de campo debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  fieldSupervisorId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Vendedor de campo debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  fieldSellerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Garante debe ser una cadena válida' })
  @Transform(({ value }) => value === '' ? null : value)
  guarantorId?: string | null;

  // Validación personalizada: al menos un campo debe estar presente
  @ValidateIf((dto) => {
    const fields = [
      dto.linerId,
      dto.telemarketingSupervisorId,
      dto.telemarketingConfirmerId,
      dto.telemarketerId,
      dto.fieldManagerId,
      dto.fieldSupervisorId,
      dto.fieldSellerId,
      dto.guarantorId
    ];
    return !fields.some(field => field !== undefined && field !== null && field !== '');
  })
  @IsString({ message: 'Al menos un participante debe ser asignado' })
  _atLeastOneField?: string;
}