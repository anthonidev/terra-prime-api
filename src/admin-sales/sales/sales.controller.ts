import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  UploadedFiles,
  ParseFilePipeBuilder,
  HttpStatus,
  ValidationPipe,
  UseInterceptors,
  UsePipes,
  Res,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { FindAllLeadsByDayDto } from './dto/find-all-leads-by-day.dto';
import { AssignLeadsToVendorDto } from './dto/assign-leads-to-vendor.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FindAllLotsDto } from './dto/find-all-lots.dto';
import { FindAllSalesDto } from './dto/find-all-sales.dto';
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
import { UpdateReservationPeriodDto } from './dto/update-reservation-period.dto';
import { UpdateFinancingInstallmentsDto } from './dto/update-financing-installments.dto';
import { CreateFinancingAmendmentDto } from './dto/create-financing-amendment.dto';
import { PaidInstallmentsAutoApprovedDto } from './dto/paid-installments-auto-approved.dto';
import { Response } from 'express';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('JVE', 'VEN')
  create(@Body() createSaleDto: CreateSaleDto, @GetUser() user: User) {
    return this.salesService.create(createSaleDto, user.id);
  }

  @Patch(':id')
  @Roles('JVE', 'VEN', 'ADM')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @GetUser() user: User,
  ) {
    return this.salesService.updateSale(id, updateSaleDto, user.id);
  }

  @Post('assign/participants/:id')
  @Roles('JVE')
  async assignParticipantsToSale(
    @Body() assignParticipantsDto: AssignParticipantsToSaleDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.assignParticipantsToSale(
      id,
      assignParticipantsDto,
    );
  }

  @Get('all/list')
  @Roles('JVE', 'FAC', 'ADM')
  findAllActives(
    @GetUser() user: User,
    @Query() findAllSalesDto: FindAllSalesDto,
  ) {
    return this.salesService.findAllWithFilters(findAllSalesDto);
  }

  @Get('all/list/vendor')
  @Roles('JVE', 'VEN')
  findAll(@GetUser() user: User, @Query() findAllSalesDto: FindAllSalesDto) {
    return this.salesService.findAllVendorWithFilters(findAllSalesDto, user.id);
  }

  @Get(':id/export-excel')
  @Roles('JVE', 'VEN', 'FAC', 'ADM', 'SYS')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportSaleToExcel(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.salesService.exportSaleToExcel(id);
    res.set({
      'Content-Disposition': `attachment; filename="venta-${id}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/export-excel-smart')
  @Roles('ADM')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportSaleToExcelSmart(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.salesService.exportSaleToExcelSmart(id);
    res.set({
      'Content-Disposition': `attachment; filename="venta-detallada-${id}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @Roles('JVE', 'VEN', 'FAC', 'ADM')
  async findOneById(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOneById(id);
  }

  @Get('leads/day')
  @Roles('JVE')
  findAllLeadsByDay(@Query() findAllLeadsByDayDto: FindAllLeadsByDayDto) {
    return this.salesService.findAllLeadsByDay(findAllLeadsByDayDto);
  }

  @Post('leads/assign/vendor')
  @Roles('JVE')
  assignLeadsToVendor(@Body() assignLeadsToVendorDto: AssignLeadsToVendorDto) {
    return this.salesService.assignLeadsToVendor(assignLeadsToVendorDto);
  }

  @Get('vendors/actives')
  @Roles('JVE')
  findAllVendors() {
    return this.salesService.findAllVendors();
  }

  @Get('projects/actives')
  @Roles('JVE', 'VEN', 'ADM', 'REC')
  findAllActiveProjects() {
    return this.salesService.findAllActiveProjects();
  }

  @Get('stages/:projectId')
  @Roles('JVE', 'VEN', 'ADM')
  async findAllStagesByProjectId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.salesService.findAllStagesByProjectId(projectId);
  }

  @Get('blocks/:stageId')
  @Roles('JVE', 'VEN', 'ADM')
  async findAllBlocksByStageId(
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.salesService.findAllBlocksByStageId(stageId);
  }

  @Get('lots/:blockId')
  @Roles('JVE', 'VEN', 'ADM')
  async findAllLotsByBlockId(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Query() findAllLotsDto: FindAllLotsDto,
  ) {
    return this.salesService.findAllLotsByBlockId(blockId, findAllLotsDto);
  }

  @Get('projects/lots/:blockId')
  @Roles('JVE', 'VEN', 'ADM')
  async findAllLotsByProjectId(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @Query() findAllLotsDto: FindAllLotsDto,
  ) {
    return this.salesService.findAllLotsByProjectId(blockId, findAllLotsDto);
  }

  @Get('leads/vendor')
  @Roles('VEN')
  async findAllLeadsByUser(@GetUser() user: User) {
    return this.salesService.findAllLeadsByUser(user.id);
  }

  @Post('financing/calculate-amortization')
  @Roles('JVE', 'VEN', 'ADM')
  async calculateAmortization(
    @Body() calculateAmortizationDto: CalculateAmortizationDto,
  ) {
    return this.salesService.calculateAmortization(calculateAmortizationDto);
  }

  @Get('guarantors/:id')
  @Roles('JVE', 'VEN')
  async findOneGuarantorById(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOneGuarantorById(id);
  }

  @Get('clients/document/:document')
  @Roles('JVE', 'VEN')
  async findOneClientByDocument(@Param('document') document: string) {
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
    return this.salesService.createPaymentSale(
      id,
      createPaymentSaleDto,
      files,
      user.id,
    );
  }

  @Patch(':saleId/reservation-period')
  @Roles('JVE', 'ADM', 'VEN')
  async updateReservationPeriod(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() updatePeriodDto: UpdateReservationPeriodDto,
  ) {
    return this.salesService.updateReservationPeriod(
      saleId,
      updatePeriodDto.additionalDays,
    );
  }

  @Delete(':id')
  @Roles('JVE', 'ADM')
  async deleteSale(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.deleteSale(id);
  }

  @Patch(':saleId/financing/:financingId/installments')
  @Roles('ADM')
  async updateFinancingInstallments(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Param('financingId', ParseUUIDPipe) financingId: string,
    @Body() updateInstallmentsDto: UpdateFinancingInstallmentsDto,
  ) {
    return this.salesService.updateFinancingInstallments(
      saleId,
      financingId,
      updateInstallmentsDto,
    );
  }

  @Get(':saleId/financing/:financingId')
  @Roles('ADM', 'JVE', 'FAC')
  async getFinancingWithInstallments(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Param('financingId', ParseUUIDPipe) financingId: string,
  ) {
    return this.salesService.getFinancingWithInstallments(saleId, financingId);
  }

  @Post(':saleId/financing/:financingId/amendment')
  @Roles('ADM')
  async createFinancingAmendment(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Param('financingId', ParseUUIDPipe) financingId: string,
    @Body() createAmendmentDto: CreateFinancingAmendmentDto,
  ) {
    return this.salesService.createFinancingAmendment(
      saleId,
      financingId,
      createAmendmentDto,
    );
  }

  @Post('financing/installments/paid-approved/:financingId')
  @Roles('ADM')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async paidInstallmentsAutoApproved(
    @Param('financingId', ParseUUIDPipe) financingId: string,
    @Body() paidInstallmentsDto: PaidInstallmentsAutoApprovedDto,
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
    return this.salesService.paidInstallmentsAutoApproved(
      financingId,
      paidInstallmentsDto.amountPaid,
      paidInstallmentsDto.payments,
      files,
      user.id,
      paidInstallmentsDto.dateOperation,
      paidInstallmentsDto.numberTicket,
      paidInstallmentsDto.observation,
    );
  }

  @Post('financing/initial-amount/paid-approved/:financingId')
  @Roles('ADM')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async paidInitialAmountAutoApproved(
    @Param('financingId', ParseUUIDPipe) financingId: string,
    @Body() paidInitialAmountDto: PaidInstallmentsAutoApprovedDto,
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
    return this.salesService.paidInitialAmountAutoApproved(
      financingId,
      paidInitialAmountDto.amountPaid,
      paidInitialAmountDto.payments,
      files,
      user.id,
      paidInitialAmountDto.dateOperation,
      paidInitialAmountDto.numberTicket,
      paidInitialAmountDto.observation,
    );
  }

  @Post('reservation/paid-approved/:saleId')
  @Roles('ADM')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async paidReservationAutoApproved(
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Body() paidReservationDto: PaidInstallmentsAutoApprovedDto,
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
    return this.salesService.paidReservationAutoApproved(
      saleId,
      paidReservationDto.amountPaid,
      paidReservationDto.payments,
      files,
      user.id,
      paidReservationDto.dateOperation,
      paidReservationDto.numberTicket,
      paidReservationDto.observation,
    );
  }

  @Post('financing/late-fees/paid-approved/:financingId')
  @Roles('ADM')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  async paidLateFeesAutoApproved(
    @Param('financingId', ParseUUIDPipe) financingId: string,
    @Body() paidLateFeesDto: PaidInstallmentsAutoApprovedDto,
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
    return this.salesService.paidLateFeesAutoApproved(
      financingId,
      paidLateFeesDto.amountPaid,
      paidLateFeesDto.payments,
      files,
      user.id,
      paidLateFeesDto.dateOperation,
      paidLateFeesDto.numberTicket,
      paidLateFeesDto.observation,
    );
  }
}
