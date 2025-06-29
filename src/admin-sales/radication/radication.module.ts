import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadicationController } from './radication.controller';
import { RadicationService } from './radication.service';
import { Sale } from '../sales/entities/sale.entity';
import { PdfService } from '../../common/services/pdf.service';
import { FilesModule } from '../../files/files.module';
import { UrbanDevelopmentModule } from '../urban-development/urban-development.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
    FilesModule, 
    UrbanDevelopmentModule,
  ],
  controllers: [RadicationController],
  providers: [
    RadicationService,
    PdfService,
  ],
  exports: [RadicationService],
})
export class RadicationModule {}