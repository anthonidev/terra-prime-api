import { Module } from '@nestjs/common';
import { LeadModule } from 'src/lead/lead.module';
import { CutsService } from './services/cuts.service';
import { ScheduledTasksService } from './services/schedules-tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CutConfiguration } from './entities/cut_configurations.entity';
import { CutExecution } from './entities/cut_executions.entity';
import { CutExecutionLog } from './entities/cut_execution_logs.entity';
import { SalesModule } from 'src/admin-sales/sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CutConfiguration,
      CutExecution,
      CutExecutionLog,
    ]),
    LeadModule,
    SalesModule,
  ],
  providers: [
    CutsService,
    ScheduledTasksService,
  ],
  exports: [
    CutsService,
    ScheduledTasksService,
  ],
})
export class CutsModule {}
