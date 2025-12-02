import { Transform, Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateDetailPaymentDto {
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    bankName?: string;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    transactionReference?: string;

    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    codeOperation?: string;

    @IsDateString({}, { message: 'La fecha de transacción debe ser válida' })
    @IsOptional()
    transactionDate?: string;

    @IsNumber(
        { maxDecimalPlaces: 2 },
        { message: 'El monto debe ser un número válido con hasta 2 decimales' },
    )
    @Min(0, { message: 'El monto no puede ser negativo' })
    @IsOptional()
    @Type(() => Number)
    amount?: number;
}
