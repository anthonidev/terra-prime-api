import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/payment-details.entity';
import { PaymentConfig } from './entities/payments-config.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentDetails, Payment, PaymentConfig])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
