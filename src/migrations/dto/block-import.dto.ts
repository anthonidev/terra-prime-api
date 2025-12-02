import { IsNotEmpty, IsString } from 'class-validator';

export class BlockImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del bloque es requerido' })
  name: string;
}
