import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from '@config/envs';
import { UsersModule } from '@iam/users/users.module';

import { AuthController } from './controllers/auth.controller';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
