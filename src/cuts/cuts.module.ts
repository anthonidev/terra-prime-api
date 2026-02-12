import { Module } from '@nestjs/common';
import { LeadModule } from 'src/lead/lead.module';
import { ScheduledTasksService } from './services/schedules-tasks.service';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';

@Module({
  imports: [
    LeadModule,
    SalesModule,
    FinancingModule,
  ],
  providers: [
    ScheduledTasksService,
  ],
  exports: [
    ScheduledTasksService,
  ],
})
export class CutsModule {}
