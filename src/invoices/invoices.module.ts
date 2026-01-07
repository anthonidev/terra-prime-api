import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoiceSeriesConfig } from './entities/invoice-series-config.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CommonModule } from 'src/common/common.module';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, InvoiceSeriesConfig, Payment]),
    CommonModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
