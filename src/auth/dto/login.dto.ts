import { IsString, MinLength } from 'class-validator';
export class LoginDto {
  @IsString()
  document: string;
  @IsString()
  @MinLength(6)
  password: string;
}
