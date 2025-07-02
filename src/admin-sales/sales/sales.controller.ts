import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe, ParseIntPipe, UploadedFiles, ParseFilePipeBuilder, HttpStatus, ValidationPipe, UseInterceptors, UsePipes } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { FindAllLeadsByDayDto } from './dto/find-all-leads-by-day.dto';
import { AssignLeadsToVendorDto } from './dto/assign-leads-to-vendor.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FindAllLotsDto } from './dto/find-all-lots.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { CalculateAmortizationDto } from '../financing/dto/calculate-amortizacion-dto';
import { CreateGuarantorDto } from '../guarantors/dto/create-guarantor.dto';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { CreateClientAndGuarantorDto } from './dto/create-client-and-guarantor.dto';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreatePaymentSaleDto } from './dto/create-payment-sale.dto';
import { AssignParticipantsToSaleDto } from './dto/assign-participants-to-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('JVE', 'VEN')
  create(
    @Body() createSaleDto: CreateSaleDto,
    @GetUser() user: User,
  ) {
    return this.salesService.create(createSaleDto, user.id);
  }

  @Post('assign/participants/:id')
  @Roles('JVE')
  async assignParticipantsToSale(
    @Body() assignParticipantsDto: AssignParticipantsToSaleDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.assignParticipantsToSale(id, assignParticipantsDto);
  }

  @Get('all/list')
  @Roles('JVE', 'FAC')
  findAllActives(
    @GetUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.salesService.findAll(paginationDto);
  }

  @Get('all/list/vendor')
  @Roles('JVE', 'VEN')
  findAll(
    @GetUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.salesService.findAll(paginationDto, user.id);
  }

  @Get(':id')
  @Roles('JVE', 'VEN')
  async findOneById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOneById(id);
  }

  @Get('leads/day')
  @Roles('JVE')
  findAllLeadsByDay(
    @Query() findAllLeadsByDayDto: FindAllLeadsByDayDto,
  ) {
    return this.salesService.findAllLeadsByDay(findAllLeadsByDayDto);
  }

  @Post('leads/assign/vendor')
  @Roles('JVE')
  assignLeadsToVendor(
    @Body() assignLeadsToVendorDto: AssignLeadsToVendorDto,
  ) {
    return this.salesService.assignLeadsToVendor(assignLeadsToVendorDto);
  }

  @Get('vendors/actives')
  @Roles('JVE')
  findAllVendors() {
    return this.salesService.findAllVendors();
  }

  @Get('projects/actives')
  @Roles('JVE', 'VEN')
  findAllActiveProjects() {
    return this.salesService.findAllActiveProjects();
  }

  @Get('stages/:projectId')
  @Roles('JVE', 'VEN')
  async findAllStagesByProjectId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.salesService.findAllStagesByProjectId(projectId);
  }

  @Get('blocks/:stageId')
  @Roles('JVE', 'VEN')
  async findAllBlocksByStageId(
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.salesService.findAllBlocksByStageId(stageId);
  }

  @Get('lots/:blockId')
  @Roles('JVE', 'VEN')
  async findAllLotsByBlockId(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Query() findAllLotsDto: FindAllLotsDto,
  ) {
    return this.salesService.findAllLotsByBlockId(blockId, findAllLotsDto);
  }

  @Get('leads/vendor')
  @Roles('VEN')
  async findAllLeadsByUser(
    @GetUser() user: User,
  ) {
    return this.salesService.findAllLeadsByUser(user.id);
  }

  @Post('financing/calculate-amortization')
  @Roles('JVE', 'VEN')
  async calculateAmortization(
    @Body() calculateAmortizationDto: CalculateAmortizationDto,
  ) {
    return this.salesService.calculateAmortization(calculateAmortizationDto);
  }

  @Get('guarantors/:id')
  @Roles('JVE', 'VEN')
  async findOneGuarantorById(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.salesService.findOneGuarantorById(id);
  }

  @Get('clients/document/:document')
  @Roles('JVE', 'VEN')
  async findOneClientByDocument(
    @Param('document') document: string,
  ) { 
    return this.salesService.findOneClientByDocument(document); 
  }

  @Post('clients/guarantors/create')
  @Roles('JVE', 'VEN')
  async createClientAndGuarantor(
    @Body() createClientAndGuarantorDto: CreateClientAndGuarantorDto,
    @GetUser() user: User,
  ) {   
    return this.salesService.createClientAndGuarantor({
      ...createClientAndGuarantorDto,
      userId: user.id,
    });
  }

  @Post('payments/sale/:id')
  @Roles('JVE', 'VEN')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPaymentSale(
    @Body() createPaymentSaleDto: CreatePaymentSaleDto,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 2,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    files: Array<Express.Multer.File>,
  ) {   
    return this.salesService.createPaymentSale(id, createPaymentSaleDto, files, user.id);
  }
}
