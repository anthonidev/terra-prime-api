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
  UseInterceptors,
  ValidationPipe,
  UsePipes,
  UploadedFiles,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { PaidInstallmentsDto } from './dto/paid-installments.dto';
import { PaidSpecificInstallmentDto } from './dto/paid-specific-installment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FindPaymentsDto } from 'src/admin-payments/payments/dto/find-payments.dto';
import { CollectorStatisticsFiltersDto } from './dto/collector-statistics-filters.dto';
import { ClientFiltersDto } from './dto/client-filters.dto';

@Controller('collections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('assign-clients-to-collector')
  @Roles('SCO')
  assignClientsToCollector(
    @Body() assignClientsToCollectorDto: AssignClientsToCollectorDto,
  ) {
    return this.collectionsService.assignClientsToCollector(
      assignClientsToCollectorDto,
    );
  }

  @Get('collectors/list')
  @Roles('SCO')
  findAllCollectors(@Query() paginationDto: PaginationDto) {
    return this.collectionsService.findAllCollectors(paginationDto);
  }

  @Get('clients/list')
  @Roles('SCO', 'ADM')
  findAllClientsWithCollection(@Query() filters: ClientFiltersDto) {
    return this.collectionsService.findAllClientsWithCollection(filters);
  }

  @Get('clients/list-by-user')
  @Roles('COB')
  findAllClientsByUser(
    @GetUser() user: User,
    @Query() filters: ClientFiltersDto,
  ) {
    return this.collectionsService.findAllClientsByUser(user.id, filters);
  }

  @Get('sales/list-by-client/:clientId')
  @Roles('COB', 'SCO', 'ADM')
  findAllSalesByClient(@Param('clientId') clientId: number) {
    return this.collectionsService.findAllSalesByClient(clientId);
  }

  @Get('clients/sales/:saleId')
  @Roles('COB', 'SCO', 'FAC', 'ADM')
  findOneSaleByIdForClient(@Param('saleId') saleId: string) {
    return this.collectionsService.findOneSaleByIdForClient(saleId);
  }

  @Get('list/payments')
  @Roles('COB', 'SCO')
  async findAllPayments(
    @Query() filters: FindPaymentsDto,
    @GetUser() user: User,
  ) {
    return this.collectionsService.findAllPaymentsByCollector(filters, user.id);
  }

  @Get('list/all/payments')
  @Roles('SCO')
  async findAllPaymentsAll(@Query() filters: FindPaymentsDto) {
    return this.collectionsService.findAllPaymentsByCollector(filters);
  }

  @Get('payments/details/:id')
  @Roles('COB', 'SCO')
  async findOnePayment(@Param('id') id: number) {
    return this.collectionsService.findOnePaymentByCollector(id);
  }

  @Post('financing/installments/paid/:financingId')
  @Roles('COB', 'SCO')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  paidInstallments(
    @Param('financingId') financingId: string,
    @Body() paidInstallmentsDto: PaidInstallmentsDto,
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
    return this.collectionsService.paidInstallments(
      financingId,
      paidInstallmentsDto.amountPaid,
      paidInstallmentsDto.payments,
      files,
      user.id,
    );
  }

  @Post('financing/installment/paid/:installmentId')
  @Roles('COB', 'SCO')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  paidSpecificInstallment(
    @Param('installmentId') installmentId: string,
    @Body() paidSpecificInstallmentDto: PaidSpecificInstallmentDto,
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
    return this.collectionsService.paidSpecificInstallment(
      installmentId,
      paidSpecificInstallmentDto.amountPaid,
      paidSpecificInstallmentDto.payments,
      files,
      user.id,
    );
  }

  @Post('financing/late-fees/paid/:financingId')
  @Roles('COB', 'SCO', 'ADM')
  @UseInterceptors(FilesInterceptor('files'))
  @UsePipes(new ValidationPipe({ transform: true }))
  paidLateFees(
    @Param('financingId') financingId: string,
    @Body() paidInstallmentsDto: PaidInstallmentsDto,
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
    return this.collectionsService.paidLateFees(
      financingId,
      paidInstallmentsDto.amountPaid,
      paidInstallmentsDto.payments,
      files,
      user.id,
    );
  }

  @Get('financing/late-fees/:financingId')
  @Roles('COB', 'SCO', 'ADM')
  getInstallmentsWithPendingLateFees(
    @Param('financingId') financingId: string,
  ) {
    return this.collectionsService.getInstallmentsWithPendingLateFees(
      financingId,
    );
  }

  @Get('financing/late-fees/total/:financingId')
  @Roles('COB', 'SCO', 'ADM')
  getTotalPendingLateFees(@Param('financingId') financingId: string) {
    return this.collectionsService.getTotalPendingLateFees(financingId);
  }

  @Get('collectors/statistics')
  @Roles('SCO')
  getCollectorStatistics(@Query() filters: CollectorStatisticsFiltersDto) {
    return this.collectionsService.getCollectorStatistics(filters);
  }

  @Get('ubigeo/departamentos')
  @Roles('SCO', 'COB')
  findAllDepartamentos() {
    return this.collectionsService.findAllDepartamentos();
  }

  @Get('ubigeo/provincias/:departamentoId')
  @Roles('SCO', 'COB')
  findProvinciasByDepartamento(
    @Param('departamentoId') departamentoId: string,
  ) {
    return this.collectionsService.findProvinciasByDepartamento(
      +departamentoId,
    );
  }

  @Get('ubigeo/distritos/:provinciaId')
  @Roles('SCO', 'COB')
  findDistritosByProvincia(@Param('provinciaId') provinciaId: string) {
    return this.collectionsService.findDistritosByProvincia(+provinciaId);
  }

  @Get('collectors/all')
  @Roles('SCO')
  findAllCollectorsWithoutPagination() {
    return this.collectionsService.findAllCollectorsWithoutPagination();
  }
}
