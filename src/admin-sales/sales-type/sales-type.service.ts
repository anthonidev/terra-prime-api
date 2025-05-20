import { Injectable } from '@nestjs/common';
import { CreateSalesTypeDto } from './dto/create-sales-type.dto';
import { UpdateSalesTypeDto } from './dto/update-sales-type.dto';

@Injectable()
export class SalesTypeService {
  create(createSalesTypeDto: CreateSalesTypeDto) {
    return 'This action adds a new salesType';
  }

  findAll() {
    return `This action returns all salesType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} salesType`;
  }

  update(id: number, updateSalesTypeDto: UpdateSalesTypeDto) {
    return `This action updates a #${id} salesType`;
  }

  remove(id: number) {
    return `This action removes a #${id} salesType`;
  }
}
