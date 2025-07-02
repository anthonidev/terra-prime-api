import { Module } from '@nestjs/common';
import { ReportsPaymentAcordService } from './reports-payment-acord.service';
import { ReportsPaymentAcordController } from './reports-payment-acord.controller';
import { FilesModule } from 'src/files/files.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { ReportsPaymentAcordPdfService } from './reports-payment-acord.pdf.service';

@Module({
  imports: [FilesModule, SalesModule],
  controllers: [ReportsPaymentAcordController],
  providers: [ReportsPaymentAcordService, ReportsPaymentAcordPdfService],
})
export class ReportsPaymentAcordModule {}
