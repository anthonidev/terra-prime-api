import { Transform, Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

/**
 * DTO para crear detalles de pago cuando ya se tiene la URL del archivo
 * (no se necesita subir archivo, se usa la URL existente)
 */
export class CreateDetailPaymentWithUrlDto {
    @IsString()
    @IsOptional()
    @Transform(({ value }) => value?.trim())
    bankName?: string;

    @IsString()
    @IsNotEmpty({ message: 'La referencia de transacción es requerida' })
    @Transform(({ value }) => value?.trim())
    transactionReference: string;

    @IsString()
    @IsNotEmpty({ message: 'El código de operación es requerido' })
    @Transform(({ value }) => value?.trim())
    codeOperation: string;

    @IsDateString({}, { message: 'La fecha de transacción debe ser válida' })
    @IsNotEmpty({ message: 'La fecha de transacción es requerida' })
    transactionDate: string;

    @IsNumber(
        { maxDecimalPlaces: 2 },
        { message: 'El monto debe ser un número válido con hasta 2 decimales' },
    )
    @Min(0, { message: 'El monto no puede ser negativo' })
    @IsNotEmpty({ message: 'El monto del pago es requerido' })
    @Type(() => Number)
    amount: number;

    @IsString()
    @IsNotEmpty({ message: 'La URL del archivo es requerida' })
    url: string;

    @IsString()
    @IsNotEmpty({ message: 'La clave del archivo (urlKey) es requerida' })
    urlKey: string;
}
