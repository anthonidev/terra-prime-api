import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class UpdateCodeOperationDto {
    @IsString()
    @IsNotEmpty({ message: 'El código de operación es requerido' })
    @Transform(({ value }) => value?.trim())
    codeOperation: string;
}
