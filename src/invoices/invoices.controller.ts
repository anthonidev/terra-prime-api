import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { Invoice } from './entities/invoice.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

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

  @Get()
  @Roles('FAC', 'ADM', 'JVE')
  async findAll(): Promise<Invoice[]> {
    return await this.invoicesService.findAll();
  }

  @Get(':id')
  @Roles('FAC', 'ADM', 'JVE')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Invoice> {
    return await this.invoicesService.findOne(id);
  }
}
