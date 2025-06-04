import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleWithdrawal } from './entities/sale-withdrawal.entity';
import { SalesService } from '../sales/sales.service';
import { CreateSaleWithdrawalDto } from './dto/create-sale-withdrawal.dto';
import { TransactionService } from 'src/common/services/transaction.service';
import { LotService } from 'src/project/services/lot.service';
import { LotStatus } from 'src/project/entities/lot.entity';
import { StatusSale } from '../sales/enums/status-sale.enum';

@Injectable()
export class SalesWithdrawalService {
  constructor(
    @InjectRepository(SaleWithdrawal)
    private readonly saleWithdrawalRepository: Repository<SaleWithdrawal>,
    private readonly saleService: SalesService,
    private readonly transactionService: TransactionService,
    private readonly lotService: LotService,
  ) {}

  async create(
    createSaleWithdrawalDto: CreateSaleWithdrawalDto,
    userId: string,
  ): Promise<SaleWithdrawal> {
    const { saleId, amount, reason } = createSaleWithdrawalDto;
    await this.saleService.isValidSaleForWithdrawal(createSaleWithdrawalDto.saleId);
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const saleWithdrawal = this.saleWithdrawalRepository.create({
        sale: { id: saleId },
        amount,
        reason,
        reviewedBy: { id: userId },
      });
      const saleWithdrawalSaved = await queryRunner.manager.save(saleWithdrawal);
      await this.lotService.updateStatus(saleWithdrawal.sale.lot.id, LotStatus.ACTIVE, queryRunner);
      await this.saleService.updateStatusSale(saleId, StatusSale.REJECTED, queryRunner);
      return saleWithdrawalSaved;
    });
  }
}
