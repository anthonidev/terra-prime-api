import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { AwsS3Service } from 'src/files/aws-s3.service';

export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  document: string;
  photo: string | null;
  role: {
    id: number;
    code: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true },
        relations: ['role'],
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'document',
          'photo',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        document: user.document,
        photo: user.photo,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener perfil: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener el perfil');
    }
  }

  async updatePhoto(userId: string, photo: Express.Multer.File): Promise<User> {
    try {
      // Validar que el archivo sea una imagen
      if (!photo.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      // Validar tamaño del archivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (photo.size > maxSize) {
        throw new BadRequestException(
          'La imagen es demasiado grande. Máximo 5MB',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Si el usuario ya tiene una foto, eliminar la anterior
      if (user.photo) {
        try {
          await this.awsS3Service.deleteFileByUrl(user.photo);
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar la foto anterior: ${error.message}`,
          );
        }
      }

      // Subir la nueva foto
      const uploadResult = await this.awsS3Service.uploadImage(
        photo,
        'profile-photos',
      );

      // Actualizar la URL de la foto en la base de datos
      await this.userRepository.update(userId, { photo: uploadResult.url });

      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'photo'],
      });

      this.logger.log(`Foto de perfil actualizada para usuario ${userId}`);
      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar foto de perfil: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al actualizar la foto de perfil',
      );
    }
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Validar email único si se está actualizando
      if (updateDto.email && updateDto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateDto.email.toLowerCase() },
        });

        if (existingUser) {
          throw new ConflictException('El correo electrónico ya está en uso');
        }
      }

      // Actualizar solo los campos proporcionados
      const updateData: Partial<User> = {};

      if (updateDto.email) {
        updateData.email = updateDto.email.toLowerCase();
      }

      if (updateDto.firstName) {
        updateData.firstName = updateDto.firstName.trim();
      }

      if (updateDto.lastName) {
        updateData.lastName = updateDto.lastName.trim();
      }

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateData).length > 0) {
        await this.userRepository.update(userId, updateData);
      }

      // Obtener el usuario actualizado
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'document',
          'photo',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      });

      this.logger.log(`Perfil actualizado para usuario ${userId}`);

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName,
        document: updatedUser.document,
        photo: updatedUser.photo,
        role: {
          id: updatedUser.role.id,
          code: updatedUser.role.code,
          name: updatedUser.role.name,
        },
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar perfil: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar el perfil');
    }
  }
}
