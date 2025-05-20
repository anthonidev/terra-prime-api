import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentDetails } from './entities/payment-details.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentDetails])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
