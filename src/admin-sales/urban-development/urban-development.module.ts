import { Module } from '@nestjs/common';
import { UrbanDevelopmentService } from './urban-development.service';
import { UrbanDevelopmentController } from './urban-development.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrbanDevelopment } from './entities/urban-development.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UrbanDevelopment])],
  controllers: [UrbanDevelopmentController],
  providers: [UrbanDevelopmentService],
})
export class UrbanDevelopmentModule {}
