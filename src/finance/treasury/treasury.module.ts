import { Module } from '@nestjs/common';

import { PaymentsModule } from './payments/payments.module';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';

@Module({
  controllers: [TreasuryController],
  providers: [TreasuryService],
  imports: [PaymentsModule],
})
export class TreasuryModule {}
