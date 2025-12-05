import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ApprovePaymentDto {
  // @IsString({ message: 'El nombre del banco es una cadena de texto' })
  // @IsNotEmpty({ message: 'El nombre del banco es requerido' })
  // banckName: string;

  @IsDateString(
    {},
    { message: 'La fecha de operación debe ser una fecha válida' },
  )
  @IsNotEmpty({ message: 'La fecha de operación es requerida' })
  dateOperation: string;

  @IsString()
  @IsOptional()
  numberTicket?: string;
}
