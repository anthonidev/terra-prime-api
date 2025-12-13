import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './controllers/users.controller';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { View } from './entities/view.entity';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, View, User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
