import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Block } from './entities/block.entity';
import { BloksController } from './bloks.controller';
import { BloksService } from './bloks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Block])],
  controllers: [BloksController],
  providers: [BloksService],
})
export class BloksModule {}
