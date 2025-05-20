import { Module } from '@nestjs/common';
import { LateFeeService } from './late-fee.service';
import { LateFeeController } from './late-fee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LateTee } from './entities/lafe-tee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LateTee])],
  controllers: [LateFeeController],
  providers: [LateFeeService],
})
export class LateFeeModule {}
