import { Controller } from '@nestjs/common';
import { FinancingService } from './financing.service';

@Controller('financing')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}
}
