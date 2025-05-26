import { Module } from '@nestjs/common';
import { TransactionService } from './services/transaction.service';

@Module({
  imports: [],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class CommonModule {}
