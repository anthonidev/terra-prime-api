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
export class CreateUserDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{6,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
  @IsString()
  @MinLength(8, { message: 'El documento debe tener al menos 8 caracteres' })
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  @IsNotEmpty({ message: 'El documento es requerido' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo debe contener números' })
  document: string;
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La URL de la foto no puede tener más de 500 caracteres',
  })
  @Matches(/^https?:\/\/.*\.(jpg|jpeg|png)$/, {
    message: 'La URL de la foto debe ser válida y terminar en jpg, jpeg o png',
  })
  photo?: string;
  @IsNotEmpty({ message: 'El rol es requerido' })
  roleId: number;
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
