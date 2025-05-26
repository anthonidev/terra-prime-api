import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateFinancingDto } from './dto/create-financing.dto';
import { UpdateFinancingDto } from './dto/update-financing.dto';
import { FinancingService } from './services/financing.service';

@Controller('financing')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}

  @Post()
  create(@Body() createFinancingDto: CreateFinancingDto) {
    return this.financingService.create(createFinancingDto);
  }
}
