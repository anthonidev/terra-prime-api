import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindInvoicesDto } from './dto/find-invoices.dto';
import { AnnulInvoiceDto } from './dto/annul-invoice.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { Invoice } from './entities/invoice.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/helpers/pagination.helper';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles('FAC', 'ADM')
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @GetUser() user: User,
  ): Promise<Invoice> {
    return await this.invoicesService.create(createInvoiceDto, user);
  }

  @Post('annul/:id')
  @Roles('FAC', 'ADM')
  async annulInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() annulDto: AnnulInvoiceDto,
  ): Promise<Invoice> {
    return await this.invoicesService.annulInvoice(id, annulDto);
  }

  @Get()
  @Roles('FAC', 'ADM', 'JVE')
  async findAll(@Query() filters: FindInvoicesDto): Promise<PaginatedResult<Invoice>> {
    return await this.invoicesService.findAll(filters);
  }

  @Get('by-payment/:paymentId')
  @Roles('FAC', 'ADM', 'JVE')
  async findOne(@Param('paymentId', ParseIntPipe) paymentId: number): Promise<Invoice> {
    return await this.invoicesService.findOne(paymentId);
  }
}
