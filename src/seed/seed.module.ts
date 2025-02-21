import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { View } from 'src/user/entities/view.entity';
import { Role } from 'src/user/entities/role.entity';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([View, Role]), UsersModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
