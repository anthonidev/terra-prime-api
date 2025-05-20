import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FinancingService } from './financing.service';
import { CreateFinancingDto } from './dto/create-financing.dto';
import { UpdateFinancingDto } from './dto/update-financing.dto';

@Controller('financing')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}

  @Post()
  create(@Body() createFinancingDto: CreateFinancingDto) {
    return this.financingService.create(createFinancingDto);
  }

  @Get()
  findAll() {
    return this.financingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFinancingDto: UpdateFinancingDto) {
    return this.financingService.update(+id, updateFinancingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financingService.remove(+id);
  }
}
