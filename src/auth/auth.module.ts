import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from 'src/config/envs';
import { EmailModule } from 'src/email/email.module';
import { UsersModule } from 'src/user/user.module';
import { AuthController } from './controllers/auth.controller';
import { ChangePasswordController } from './controllers/change-password.controller';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthService } from './services/auth.service';
import { ChangePasswordService } from './services/change-password.service';
import { PasswordResetService } from './services/password-reset.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    EmailModule,

  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, PasswordResetService,
    ChangePasswordService],
  controllers: [
    AuthController,
    PasswordResetController,
    ChangePasswordController,
  ],
  exports: [AuthService],
})
export class AuthModule { }
