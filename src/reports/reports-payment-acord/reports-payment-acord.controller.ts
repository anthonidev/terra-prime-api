import { Controller } from '@nestjs/common';
import { ReportsPaymentAcordService } from './reports-payment-acord.service';

@Controller('reports-payment-acord')
export class ReportsPaymentAcordController {
  constructor(private readonly reportsPaymentAcordService: ReportsPaymentAcordService) {}
}
