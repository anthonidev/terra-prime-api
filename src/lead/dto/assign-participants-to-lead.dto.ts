import { IsOptional, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignParticipantsToLeadDto {
  @IsOptional()
  @IsString({ message: 'El ID del Líner debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  linerId?: string | null;

  @IsOptional()
  @IsString({
    message: 'El ID del Supervisor de telemarketing debe ser una cadena válida',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  telemarketingSupervisorId?: string | null;

  @IsOptional()
  @IsString({
    message:
      'El ID del Confirmador de telemarketing debe ser una cadena válida',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  telemarketingConfirmerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Telemarketer debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  telemarketerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Jefe de campo debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  fieldManagerId?: string | null;

  @IsOptional()
  @IsString({
    message: 'El ID del Supervisor de campo debe ser una cadena válida',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  fieldSupervisorId?: string | null;

  @IsOptional()
  @IsString({
    message: 'El ID del Vendedor de campo debe ser una cadena válida',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  fieldSellerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Jefe de Ventas debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  salesManagerId?: string | null;

  @IsOptional()
  @IsString({
    message: 'El ID del Gerente de Ventas debe ser una cadena válida',
  })
  @Transform(({ value }) => (value === '' ? null : value))
  salesGeneralManagerId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del PostVenta debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  postSaleId?: string | null;

  @IsOptional()
  @IsString({ message: 'El ID del Closer debe ser una cadena válida' })
  @Transform(({ value }) => (value === '' ? null : value))
  closerId?: string | null;

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
      dto.salesManagerId,
      dto.salesGeneralManagerId,
      dto.postSaleId,
      dto.closerId,
    ];
    return !fields.some(
      (field) => field !== undefined && field !== null && field !== '',
    );
  })
  @IsString({ message: 'Al menos un participante debe ser asignado' })
  _atLeastOneField?: string;
}
