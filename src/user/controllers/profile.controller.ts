import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../entities/user.entity';
import { ProfileService } from '../services/profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('')
  async getProfile(@GetUser() user: User) {
    try {
      const profile = await this.profileService.getProfile(user.id);
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener el perfil',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePhoto(
    @GetUser() user: User,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    try {
      if (!photo) {
        throw new HttpException('La foto es requerida', HttpStatus.BAD_REQUEST);
      }
      console.log('Foto recibida:', photo);
      const updatedUser = await this.profileService.updatePhoto(user.id, photo);
      return {
        success: true,
        message: 'Foto de perfil actualizada exitosamente',
        data: {
          id: updatedUser.id,
          photo: updatedUser.photo,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar la foto de perfil',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch()
  async updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      const updatedUser = await this.profileService.updateProfile(
        user.id,
        updateProfileDto,
      );
      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: updatedUser,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar el perfil',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
