import { Module } from '@nestjs/common';
import { PaymentsConfigService } from './payments-config.service';
import { PaymentConfig } from './entities/payments-config.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentConfig])],
  providers: [PaymentsConfigService],
})
export class PaymentsConfigModule {}
