import { Injectable } from '@nestjs/common';
import { CreateFinancingTypeDto } from './dto/create-financing-type.dto';
import { UpdateFinancingTypeDto } from './dto/update-financing-type.dto';

@Injectable()
export class FinancingTypeService {
  create(createFinancingTypeDto: CreateFinancingTypeDto) {
    return 'This action adds a new financingType';
  }

  findAll() {
    return `This action returns all financingType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} financingType`;
  }

  update(id: number, updateFinancingTypeDto: UpdateFinancingTypeDto) {
    return `This action updates a #${id} financingType`;
  }

  remove(id: number) {
    return `This action removes a #${id} financingType`;
  }
}
