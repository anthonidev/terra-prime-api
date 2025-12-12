import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { GetUser } from '../decorators/get-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ChangePasswordService } from '../services/change-password.service';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ApiChangePassword } from '../decorators/change-password-api.decorators';

@ApiTags('Cambio de contraseña')
@Controller('auth/change-password')
@UseGuards(JwtAuthGuard)
export class ChangePasswordController {
  constructor(private readonly changePasswordService: ChangePasswordService) {}

  @ApiChangePassword()
  @Post()
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.changePasswordService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
