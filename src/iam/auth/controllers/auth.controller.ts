import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@iam/auth/decorators/is-public.decorator';
import { LoginDto } from '@iam/auth/dto/login.dto';
import { LoginResponse } from '@iam/auth/interface/auth-response.interface';

import { AuthService } from '../services/auth.service';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }
}
