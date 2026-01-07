import { Module } from '@nestjs/common';
import { TransactionService } from './services/transaction.service';
import { FilesModule } from 'src/files/files.module';
import { PdfService } from './services/pdf.service';
import { ApiFetchAdapter } from './adapters/api-fetch.adapter';
import { NubefactAdapter } from './adapters/nubefact.adapter';

@Module({
  imports: [FilesModule],
  providers: [TransactionService, PdfService, ApiFetchAdapter, NubefactAdapter],
  exports: [TransactionService, PdfService, ApiFetchAdapter, NubefactAdapter],
})
export class CommonModule {}
