import { Module } from '@nestjs/common';
import { FinancingService } from './financing.service';
import { FinancingController } from './financing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Financing } from './entities/financing.entity';
import { FinancingInstallments } from './entities/financing-installments.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Financing, FinancingInstallments])],
  controllers: [FinancingController],
  providers: [FinancingService],
})
export class FinancingModule {}
