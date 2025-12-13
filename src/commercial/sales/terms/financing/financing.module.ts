import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Financing } from './entities/financing.entity';
import { FinancingInstallments } from './entities/financing-installments.entity';
import { FinancingController } from './financing.controller';
import { FinancingService } from './financing.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancingInstallments, Financing])],

  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
