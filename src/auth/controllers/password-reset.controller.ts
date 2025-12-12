import { Body, Controller, Post, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/is-public.decorator';
import { PasswordResetService } from '../services/password-reset.service';
import { RequestResetDto, ResetPasswordDto } from '../dto/request-reset.dto';
import {
  ApiRequestPasswordReset,
  ApiVerifyResetToken,
  ApiResetPassword,
} from '../decorators/password-reset-api.decorators';

@ApiTags('Restablecimiento de contraseña')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @ApiRequestPasswordReset()
  @Public()
  @Post('request')
  async requestReset(@Body() requestResetDto: RequestResetDto) {
    return this.passwordResetService.requestPasswordReset(
      requestResetDto.email,
    );
  }

  @ApiVerifyResetToken()
  @Public()
  @Post('verify/:token')
  async verifyToken(@Param('token') token: string) {
    return this.passwordResetService.verifyResetToken(token);
  }

  @ApiResetPassword()
  @Public()
  @Post('reset/:token')
  async resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.passwordResetService.resetPassword(
      token,
      resetPasswordDto.password,
    );
  }
}
