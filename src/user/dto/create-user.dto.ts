import {
  IsEmail,
  MinLength,
  IsString,
  Matches,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan.perez@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 6 caracteres, debe contener mayúscula, minúscula y número)',
    example: 'Password123',
    type: String,
    minLength: 6,
  })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{6,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({
    description: 'Documento de identidad del usuario (DNI, CE, etc.)',
    example: '72345678',
    type: String,
    minLength: 8,
    maxLength: 20,
  })
  @IsString()
  @MinLength(8, { message: 'El documento debe tener al menos 8 caracteres' })
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  @IsNotEmpty({ message: 'El documento es requerido' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo debe contener números' })
  document: string;

  @ApiProperty({
    description: 'Nombre(s) del usuario',
    example: 'Juan Carlos',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Apellido(s) del usuario',
    example: 'Pérez García',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    description: 'URL de la foto de perfil del usuario',
    example: 'https://example.com/photo.jpg',
    type: String,
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La URL de la foto no puede tener más de 500 caracteres',
  })
  @Matches(/^https?:\/\/.*\.(jpg|jpeg|png)$/, {
    message: 'La URL de la foto debe ser válida y terminar en jpg, jpeg o png',
  })
  photo?: string;

  @ApiProperty({
    description: 'ID del rol asignado al usuario',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'El rol es requerido' })
  roleId: number;

  @ApiProperty({
    description: 'Estado activo/inactivo del usuario',
    example: true,
    type: Boolean,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
