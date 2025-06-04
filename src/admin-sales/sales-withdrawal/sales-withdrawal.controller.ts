import { Controller } from '@nestjs/common';
import { SalesWithdrawalService } from './sales-withdrawal.service';

@Controller('sales-withdrawal')
export class SalesWithdrawalController {
  constructor(private readonly salesWithdrawalService: SalesWithdrawalService) {}
}
