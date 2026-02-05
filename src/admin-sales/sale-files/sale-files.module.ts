import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleFilesController } from './sale-files.controller';
import { SaleFilesService } from './sale-files.service';
import { SaleFile } from './entities/sale-file.entity';
import { Sale } from '../sales/entities/sale.entity';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SaleFile, Sale]),
    FilesModule,
  ],
  controllers: [SaleFilesController],
  providers: [SaleFilesService],
  exports: [SaleFilesService, TypeOrmModule],
})
export class SaleFilesModule {}
