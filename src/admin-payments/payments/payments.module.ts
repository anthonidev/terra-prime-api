import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/payment-details.entity';
import { PaymentsService } from './services/payments.service';
import { PaymentsDetailService } from './services/payments-detail.service';
import { CommonModule } from 'src/common/common.module';
import { FilesModule } from 'src/files/files.module';
import { PaymentsConfigModule } from '../payments-config/payments-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentDetails]), CommonModule, FilesModule, PaymentsConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsDetailService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
