import { Module } from '@nestjs/common';
import { ReportsLeadsModule } from './reports-leads/reports-leads.module';

@Module({
  imports: [ReportsLeadsModule]
})
export class ReportsModule {}
