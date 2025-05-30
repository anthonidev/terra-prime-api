import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './services/payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // @Post()
  // create(@Body() createPaymentDto: CreatePaymentDto) {
  //   return this.paymentsService.create(createPaymentDto);
  // }
}
