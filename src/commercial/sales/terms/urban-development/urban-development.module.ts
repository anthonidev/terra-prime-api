import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UrbanDevelopment } from './entities/urban-development.entity';
import { UrbanDevelopmentController } from './urban-development.controller';
import { UrbanDevelopmentService } from './urban-development.service';

@Module({
  imports: [TypeOrmModule.forFeature([UrbanDevelopment])],
  controllers: [UrbanDevelopmentController],
  providers: [UrbanDevelopmentService],
})
export class UrbanDevelopmentModule {}
