import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateCodeOperationDto {
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    codeOperation?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    bankName?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    transactionReference?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de transacción debe ser una fecha válida' })
    transactionDate?: string;
}
