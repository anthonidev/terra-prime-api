import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  ApiGetProfile,
  ApiUpdatePhoto,
  ApiUpdateProfile,
} from '../decorators/profile-api.decorators';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../entities/user.entity';
import { ProfileService } from '../services/profile.service';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiGetProfile()
  async getProfile(@GetUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiUpdatePhoto()
  async updatePhoto(
    @GetUser() user: User,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    if (!photo) {
      throw new BadRequestException('La foto es requerida');
    }
    return this.profileService.updatePhoto(user.id, photo);
  }

  @Patch()
  @ApiUpdateProfile()
  async updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }
}
