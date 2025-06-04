import { Module } from '@nestjs/common';
import { SalesWithdrawalService } from './sales-withdrawal.service';
import { SalesWithdrawalController } from './sales-withdrawal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleWithdrawal } from './entities/sale-withdrawal.entity';
import { SalesModule } from '../sales/sales.module';
import { ProjectModule } from 'src/project/project.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([SaleWithdrawal]), SalesModule, ProjectModule, CommonModule],
  controllers: [SalesWithdrawalController],
  providers: [SalesWithdrawalService],
})
export class SalesWithdrawalModule {}
