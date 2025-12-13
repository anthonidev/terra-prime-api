import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from '@config/envs';
import { UsersModule } from '@iam/users/users.module';

import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
