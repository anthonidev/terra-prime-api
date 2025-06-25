import { forwardRef, Module } from '@nestjs/common';
import { FinancingController } from './financing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Financing } from './entities/financing.entity';
import { FinancingInstallments } from './entities/financing-installments.entity';
import { FinancingService } from './services/financing.service';
import { FinancingInstallmentsService } from './services/financing-installments.service';
import { PaymentsModule } from 'src/admin-payments/payments/payments.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Financing, FinancingInstallments]), 
    forwardRef(() => PaymentsModule),
    CommonModule,
],
  controllers: [FinancingController],
  providers: [FinancingService, FinancingInstallmentsService],
  exports: [FinancingService, FinancingInstallmentsService, TypeOrmModule],
})
export class FinancingModule {}
