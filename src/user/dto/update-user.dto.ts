import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['document'] as const),
) {
  @ApiProperty({
    description: 'Nueva contraseña del usuario (opcional)',
    example: 'NewPassword123',
    type: String,
    required: false,
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{6,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password?: string;

  @ApiProperty({
    description: 'Documento de identidad del usuario (opcional en actualización)',
    example: '72345678',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  document?: string;
}
