import { Module } from '@nestjs/common';
import { SalesWithdrawalService } from './sales-withdrawal.service';
import { SalesWithdrawalController } from './sales-withdrawal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleWithdrawal } from './entities/sale-withdrawal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SaleWithdrawal])],
  controllers: [SalesWithdrawalController],
  providers: [SalesWithdrawalService],
})
export class SalesWithdrawalModule {}
