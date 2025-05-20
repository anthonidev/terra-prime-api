import { Module } from '@nestjs/common';
import { FinancingTypeService } from './financing-type.service';
import { FinancingTypeController } from './financing-type.controller';

@Module({
  controllers: [FinancingTypeController],
  providers: [FinancingTypeService],
})
export class FinancingTypeModule {}
