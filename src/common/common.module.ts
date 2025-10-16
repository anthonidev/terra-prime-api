import { Module } from '@nestjs/common';
import { TransactionService } from './services/transaction.service';
import { FilesModule } from 'src/files/files.module';
import { PdfService } from './services/pdf.service';
import { ApiFetchAdapter } from './adapters/api-fetch.adapter';

@Module({
  imports: [FilesModule],
  providers: [TransactionService,PdfService, ApiFetchAdapter],
  exports: [TransactionService,PdfService, ApiFetchAdapter],
})
export class CommonModule {}
