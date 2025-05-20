import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesTypeService } from './sales-type.service';
import { CreateSalesTypeDto } from './dto/create-sales-type.dto';
import { UpdateSalesTypeDto } from './dto/update-sales-type.dto';

@Controller('sales-type')
export class SalesTypeController {
  constructor(private readonly salesTypeService: SalesTypeService) {}

  @Post()
  create(@Body() createSalesTypeDto: CreateSalesTypeDto) {
    return this.salesTypeService.create(createSalesTypeDto);
  }

  @Get()
  findAll() {
    return this.salesTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalesTypeDto: UpdateSalesTypeDto) {
    return this.salesTypeService.update(+id, updateSalesTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesTypeService.remove(+id);
  }
}
