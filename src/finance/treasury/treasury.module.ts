import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';
import { PaymentsModule } from './payments/payments.module';

@Module({
  controllers: [TreasuryController],
  providers: [TreasuryService],
  imports: [PaymentsModule],
})
export class TreasuryModule {}
