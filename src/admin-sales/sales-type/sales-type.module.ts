import { Module } from '@nestjs/common';
import { SalesTypeService } from './sales-type.service';
import { SalesTypeController } from './sales-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesType } from './entities/sales-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesType])],
  controllers: [SalesTypeController],
  providers: [SalesTypeService],
})
export class SalesTypeModule {}
