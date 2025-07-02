import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { ProfileController } from './controllers/profile.controller';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { View } from './entities/view.entity';
import { ProfileService } from './services/profile.service';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
@Module({
  imports: [TypeOrmModule.forFeature([User, Role, View]), FilesModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, ProfileService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
