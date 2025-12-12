import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { ProfileController } from './controllers/profile.controller';
import { RoleController } from './controllers/role.controller';
import { UserController } from './controllers/user.controller';
import { ViewController } from './controllers/view.controller';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { View } from './entities/view.entity';
import { ProfileService } from './services/profile.service';
import { RoleService } from './services/role.service';
import { UserService } from './services/user.service';
import { ViewService } from './services/view.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, View]), FilesModule],
  controllers: [
    UserController,
    RoleController,
    ViewController,
    ProfileController,
  ],
  providers: [UserService, RoleService, ViewService, ProfileService],
  exports: [UserService, RoleService, ViewService, TypeOrmModule],
})
export class UsersModule {}
