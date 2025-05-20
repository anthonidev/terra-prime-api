import { Injectable } from '@nestjs/common';
import { CreatePaymentsConfigDto } from './dto/create-payments-config.dto';
import { UpdatePaymentsConfigDto } from './dto/update-payments-config.dto';

@Injectable()
export class PaymentsConfigService {
  create(createPaymentsConfigDto: CreatePaymentsConfigDto) {
    return 'This action adds a new paymentsConfig';
  }

  findAll() {
    return `This action returns all paymentsConfig`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentsConfig`;
  }

  update(id: number, updatePaymentsConfigDto: UpdatePaymentsConfigDto) {
    return `This action updates a #${id} paymentsConfig`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentsConfig`;
  }
}
