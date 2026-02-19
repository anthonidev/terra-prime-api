import { IsInt, IsNumber, Min } from 'class-validator';

export class InterestRateSectionDto {
  @IsInt({ message: 'El inicio del tramo debe ser un número entero' })
  @Min(1, { message: 'El inicio del tramo debe ser mayor o igual a 1' })
  startInstallment: number;

  @IsInt({ message: 'El fin del tramo debe ser un número entero' })
  @Min(1, { message: 'El fin del tramo debe ser mayor o igual a 1' })
  endInstallment: number;

  @IsNumber({}, { message: 'El porcentaje de interés debe ser un número' })
  @Min(0, { message: 'El porcentaje de interés debe ser mayor o igual a 0' })
  interestRate: number;
}
