import { forwardRef, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/payment-details.entity';
import { PaymentsService } from './services/payments.service';
import { PaymentsDetailService } from './services/payments-detail.service';
import { CommonModule } from 'src/common/common.module';
import { FilesModule } from 'src/files/files.module';
import { PaymentsConfigModule } from '../payments-config/payments-config.module';
import { SalesModule } from 'src/admin-sales/sales/sales.module';
import { FinancingInstallmentsService } from 'src/admin-sales/financing/services/financing-installments.service';
import { FinancingModule } from 'src/admin-sales/financing/financing.module';
import { ProjectModule } from 'src/project/project.module';
import { ReservationsModule } from 'src/admin-sales/reservations/reservations.module';
import { ExternalApiModule } from 'src/external-api/external-api.module';
import { InvoicesModule } from 'src/invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentDetails]),
    CommonModule, FilesModule,
    PaymentsConfigModule,
    forwardRef(() => SalesModule),
    forwardRef(() => FinancingModule),
    ProjectModule,
    ReservationsModule,
    forwardRef(() => ExternalApiModule),
    forwardRef(() => InvoicesModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsDetailService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
