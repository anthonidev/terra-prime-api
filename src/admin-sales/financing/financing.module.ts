import { Module } from '@nestjs/common';
import { FinancingController } from './financing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Financing } from './entities/financing.entity';
import { FinancingInstallments } from './entities/financing-installments.entity';
import { FinancingService } from './services/financing.service';
import { FinancingInstallmentsService } from './services/financing-installments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Financing, FinancingInstallments])],
  controllers: [FinancingController],
  providers: [FinancingService, FinancingInstallmentsService],
  exports: [FinancingService, FinancingInstallmentsService],
})
export class FinancingModule {}
