import { Module } from '@nestjs/common';
import { FinancingTypeService } from './financing-type.service';
import { FinancingTypeController } from './financing-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancingType } from './entities/financing-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FinancingType])],
  controllers: [FinancingTypeController],
  providers: [FinancingTypeService],
})
export class FinancingTypeModule {}
