import { IsNotEmpty, IsString } from 'class-validator';

export class CancelInstallmentDto {
  @IsString({ message: 'El motivo de cancelación debe ser un texto' })
  @IsNotEmpty({ message: 'El motivo de cancelación es requerido' })
  cancellationReason: string;
}
