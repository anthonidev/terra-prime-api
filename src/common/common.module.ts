import { Module } from '@nestjs/common';
import { TransactionService } from './services/transaction.service';
import { FilesModule } from 'src/files/files.module';
import { PdfService } from './services/pdf.service';

@Module({
  imports: [FilesModule],
  providers: [TransactionService,PdfService],
  exports: [TransactionService,PdfService],
})
export class CommonModule {}
