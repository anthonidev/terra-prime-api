import { Module } from '@nestjs/common';
import { ReportsLeadsModule } from './reports-leads/reports-leads.module';
import { ReportsPaymentAcordModule } from './reports-payment-acord/reports-payment-acord.module';

@Module({
  imports: [ReportsLeadsModule, ReportsPaymentAcordModule]
})
export class ReportsModule {}
