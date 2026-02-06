import { Body, Controller, Post } from '@nestjs/common';
import { CreateFinancingDto } from './dto/create-financing.dto';
import { FinancingService } from './services/financing.service';

@Controller('financing')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}

  @Post()
  create(@Body() createFinancingDto: CreateFinancingDto) {
    return this.financingService.create(createFinancingDto);
  }
}
