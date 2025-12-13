import { Module } from '@nestjs/common';
import { BloksService } from './bloks.service';
import { BloksController } from './bloks.controller';

@Module({
  controllers: [BloksController],
  providers: [BloksService],
})
export class BloksModule {}
