import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { View } from './entities/view.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, View, User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
