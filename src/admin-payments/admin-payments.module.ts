import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments/payments.module';
import { PaymentsConfigModule } from './payments-config/payments-config.module';

@Module({
  imports: [PaymentsModule, PaymentsConfigModule]
})
export class AdminPaymentsModule {}
