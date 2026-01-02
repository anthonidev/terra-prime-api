import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdateDetailPaymentDto } from './dto/update-detail-payment.dto';
import { UpdateCodeOperationDto } from './dto/update-code-operation.dto';
import { PaymentsService } from './services/payments.service';
import { PaymentsDetailService } from './services/payments-detail.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { RejectionDto } from './dto/rejection.dto';
import { ApprovePaymentDto } from './dto/approve-payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FindPaymentsDto } from './dto/find-payments.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentsDetailService: PaymentsDetailService,
  ) {}

  @Post('approve/:id')
  @Roles('FAC', 'ADM')
  async approvePayment(
    @Param('id') id: number,
    @GetUser() user: User,
    @Body() approvePaymentDto: ApprovePaymentDto,
  ) {
    return this.paymentsService.approvePayment(id, user.id, approvePaymentDto);
  }

  @Post('reject/:id')
  @Roles('FAC', 'ADM')
  async rejectPayment(
    @Param('id') id: number,
    @Body() rejectionDto: RejectionDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.rejectPayment(
      id,
      rejectionDto.rejectionReason,
      user.id,
    );
  }

  @Get('list')
  @Roles('FAC', 'ADM')
  async findAllPayments(@Query() filters: FindPaymentsDto) {
    return this.paymentsService.findAllPayments(filters);
  }

  @Get('details/:id')
  @Roles('FAC', 'ADM')
  async findOnePayment(@Param('id') id: number) {
    return this.paymentsService.findOne(id);
  }

  @Patch('complete-payment/:id')
  @Roles('FAC', 'ADM')
  completePayment(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() completePaymentDto: CompletePaymentDto,
  ) {
    return this.paymentsService.updateDataOrcompletePayment(
      id,
      user.id,
      completePaymentDto,
    );
  }

  @Patch('details/:id')
  @Roles('FAC', 'ADM')
  async updatePaymentDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDetailPaymentDto: UpdateDetailPaymentDto,
  ) {
    return this.paymentsDetailService.update(id, updateDetailPaymentDto);
  }

  @Patch('details/:id/deactivate')
  @Roles('FAC', 'ADM')
  async deactivatePaymentDetail(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsDetailService.deactivate(id);
  }

  @Patch('details/:id/code-operation')
  @Roles('FAC', 'ADM')
  async updateCodeOperation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCodeOperationDto: UpdateCodeOperationDto,
  ) {
    return this.paymentsDetailService.updateCodeOperation(
      id,
      updateCodeOperationDto.codeOperation,
    );
  }
}
