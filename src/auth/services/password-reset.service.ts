import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { envs } from 'src/config/envs';
import { EmailService } from 'src/email/email.service';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
    private readonly emailService: EmailService,
  ) {}

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        success: true,
        message:
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña',
      };
    }

    const token = uuidv4();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const resetToken = this.resetTokenRepository.create({
      token,
      user,
      expiresAt,
    });
    await this.resetTokenRepository.save(resetToken);

    await this.sendPasswordResetEmail(user.email, token);

    return {
      success: true,
      message:
        'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña',
    };
  }

  async verifyResetToken(token: string) {
    const resetToken = await this.getValidToken(token);

    return {
      success: true,
      message: 'Token válido',
      email: resetToken.user.email,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.getValidToken(token);

    const hashedPassword = await this.hashPassword(newPassword);

    await this.userRepository.update(
      { id: resetToken.user.id },
      { password: hashedPassword },
    );

    resetToken.isUsed = true;
    await this.resetTokenRepository.save(resetToken);

    await this.sendPasswordChangeConfirmationEmail(resetToken.user.email);

    return {
      success: true,
      message: 'Contraseña actualizada correctamente',
    };
  }

  private async getValidToken(token: string): Promise<PasswordResetToken> {
    const resetToken = await this.resetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new NotFoundException(
        'Token de restablecimiento no encontrado o inválido',
      );
    }

    if (resetToken.isUsed) {
      throw new UnauthorizedException('Este token ya ha sido utilizado');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new UnauthorizedException('El token ha expirado');
    }

    return resetToken;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${envs.frontendUrl}/auth/reset-password/${token}`;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Restablecimiento de contraseña - Huertas Inmboliaria',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: rgb(65, 141, 20);">Restablecimiento de Contraseña</h1>
          <p>Has solicitado restablecer tu contraseña en Huertas Inmboliaria.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <a href="${resetUrl}" style="background-color:rgb(65, 141, 20); color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 15px 0;">
            Restablecer mi contraseña
          </a>
          <p>Este enlace expirará en ${this.TOKEN_EXPIRY_HOURS} horas.</p>
          <p>Si no solicitaste este restablecimiento, puedes ignorar este correo.</p>
          <p>Saludos,<br>El equipo de Huertas Inmboliaria</p>
        </div>
      `,
    });
  }

  private async sendPasswordChangeConfirmationEmail(email: string) {
    await this.emailService.sendEmail({
      to: email,
      subject: 'Confirmación de cambio de contraseña - Huertas Inmboliaria',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h1 style="color: rgb(65, 141, 20);">Cambio de Contraseña Exitoso</h1>
          <p>Tu contraseña ha sido actualizada correctamente.</p>
          <p>Si no realizaste este cambio, por favor contacta inmediatamente con nuestro equipo de soporte.</p>
          <p>Saludos,<br>El equipo de Huertas Inmboliaria</p>
        </div>
      `,
    });
  }
}
