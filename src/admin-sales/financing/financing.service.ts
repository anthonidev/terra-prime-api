import { Injectable } from '@nestjs/common';
import { CreateFinancingDto } from './dto/create-financing.dto';
import { UpdateFinancingDto } from './dto/update-financing.dto';

@Injectable()
export class FinancingService {
  create(createFinancingDto: CreateFinancingDto) {
    return 'This action adds a new financing';
  }

  findAll() {
    return `This action returns all financing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} financing`;
  }

  update(id: number, updateFinancingDto: UpdateFinancingDto) {
    return `This action updates a #${id} financing`;
  }

  remove(id: number) {
    return `This action removes a #${id} financing`;
  }
}
