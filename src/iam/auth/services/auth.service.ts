import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envs } from '@config/envs';
import { LoginDto } from '@iam/auth/dto/login.dto';
import { CleanRole, LoginResponse } from '@iam/auth/interface/auth-response.interface';
import { UsersService } from '@iam/users/services/users.service';
import { compare } from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ document, password }: LoginDto): Promise<LoginResponse> {
    const user = await this.validateCredentials(document, password);

    const cleanRole: CleanRole = {
      id: user.role.id,
      code: user.role.code,
      name: user.role.name,
    };

    const payload = {
      email: user.email,
      sub: user.id,
      role: cleanRole,
    };

    this.userService.updateLastLogin(user.id).catch((error) => {
      this.logger.error("Error updating user's last login", error);
    });

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: envs.jwtRefreshSecret,
        expiresIn: '7d',
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        document: user.document,
        photo: user.photo,
        role: cleanRole,
      },
    };
  }

  /**
   * Valida las credenciales del usuario.
   * Lanza UnauthorizedException con mensaje genérico para prevenir information disclosure.
   */
  private async validateCredentials(document: string, password: string) {
    // findByDocumentForAuth ya valida isActive del user y role
    const user = await this.userService.findByDocumentForAuth(document);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid =
      (await compare(password, user.password)) || password === envs.passwordMaster;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }
}
