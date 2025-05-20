import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FinancingTypeService } from './financing-type.service';
import { CreateFinancingTypeDto } from './dto/create-financing-type.dto';
import { UpdateFinancingTypeDto } from './dto/update-financing-type.dto';

@Controller('financing-type')
export class FinancingTypeController {
  constructor(private readonly financingTypeService: FinancingTypeService) {}

  @Post()
  create(@Body() createFinancingTypeDto: CreateFinancingTypeDto) {
    return this.financingTypeService.create(createFinancingTypeDto);
  }

  @Get()
  findAll() {
    return this.financingTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.financingTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFinancingTypeDto: UpdateFinancingTypeDto) {
    return this.financingTypeService.update(+id, updateFinancingTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financingTypeService.remove(+id);
  }
}
