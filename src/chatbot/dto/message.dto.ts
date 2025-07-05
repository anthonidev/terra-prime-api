import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
