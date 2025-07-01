import { Module } from '@nestjs/common';
import { ReportsPaymentAcordService } from './reports-payment-acord.service';
import { ReportsPaymentAcordController } from './reports-payment-acord.controller';

@Module({
  controllers: [ReportsPaymentAcordController],
  providers: [ReportsPaymentAcordService],
})
export class ReportsPaymentAcordModule {}
