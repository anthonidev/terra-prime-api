import { Module } from '@nestjs/common';
import { UrbanDevelopmentService } from './urban-development.service';
import { UrbanDevelopmentController } from './urban-development.controller';

@Module({
  controllers: [UrbanDevelopmentController],
  providers: [UrbanDevelopmentService],
})
export class UrbanDevelopmentModule {}
