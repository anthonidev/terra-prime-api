import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SystemsService } from './systems.service';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('systems')
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Patch('update-password')
  updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.systemsService.updatePassword(
      updatePasswordDto.email,
      updatePasswordDto.password,
    );
  }
}
