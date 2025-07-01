import { Module } from '@nestjs/common';
import { ReportsLeadsService } from './reports-leads.service';
import { ReportsLeadsController } from './reports-leads.controller';
import { ReportsLeadsPdfService } from './reports-leads.pdf.service';
import { FilesModule } from 'src/files/files.module';
import { LeadModule } from 'src/lead/lead.module';

@Module({
  imports: [FilesModule, LeadModule],
  controllers: [ReportsLeadsController],
  providers: [ReportsLeadsService, ReportsLeadsPdfService],
})
export class ReportsLeadsModule {}
