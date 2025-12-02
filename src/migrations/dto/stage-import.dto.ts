import { IsNotEmpty, IsString } from 'class-validator';

export class StageImportDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la etapa es requerido' })
  name: string;
}
