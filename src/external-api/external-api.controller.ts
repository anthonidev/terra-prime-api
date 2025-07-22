import { Body, Controller, Get, HttpStatus, Param, ParseFilePipeBuilder, ParseUUIDPipe, Post, Query, UploadedFiles, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ExternalApiService } from "./external-api.service";
import { FindAllLotsDto } from "src/admin-sales/sales/dto/find-all-lots.dto";
import { CalculateAmortizationDto } from "src/admin-sales/financing/dto/calculate-amortizacion-dto";
import { CreateUpdateLeadDto } from "src/lead/dto/create-update-lead.dto";
import { CreateClientAndGuarantorDto } from "src/admin-sales/sales/dto/create-client-and-guarantor.dto";
import { CreateSaleDto } from "src/admin-sales/sales/dto/create-sale.dto";
import { PaginationDto } from "src/common/dto/paginationDto";
import { ExternalApiResponseInterceptor } from "./interceptors/external-api-response.interceptor";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Roles } from "src/auth/decorators/roles.decorator";
import { CreatePaymentSaleDto } from "src/admin-sales/sales/dto/create-payment-sale.dto";
import { User } from "src/user/entities/user.entity";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { PaidInstallmentsDto } from "src/admin-collections/collections/dto/paid-installments.dto";

@Controller('external')
@UseGuards(ApiKeyGuard) 
@UseInterceptors(ExternalApiResponseInterceptor)
export class ExternalApiController {
  private readonly EXTERNAL_USER_ID = '3f9f5e47-bfe5-4e85-b9b2-f4cd20e5e3a4';
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('projects')
  async getProjects() {
    return this.externalApiService.getProjects();
  }

  @Get('projects/:projectId/stages')
  async getStages(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.externalApiService.getStages(projectId);
  }

  @Get('stages/:stageId/blocks')
  async getBlocks(@Param('stageId', ParseUUIDPipe) stageId: string) {
    return this.externalApiService.getBlocks(stageId);
  }

  @Get('blocks/:blockId/lots')
  async getLots(@Param('blockId', ParseUUIDPipe) blockId: string) {
    return this.externalApiService.getLots(blockId);
  }

  @Get('projects/:projectId/lots')
  async findLotsByProjectId(
    @Param('projectId') projectId: string,
    @Query() findAllLotsDto: FindAllLotsDto,
  ) {
    return this.externalApiService.findLotsByProjectId(projectId, findAllLotsDto);
  }

  @Post('calculate/amortization')
  async calculateAmortization(@Body() calculateDto: CalculateAmortizationDto) {
    return this.externalApiService.calculeAmortization(
      calculateDto.totalAmount,
      calculateDto.initialAmount,
      calculateDto.reservationAmount,
      calculateDto.interestRate,
      calculateDto.numberOfPayments,
      calculateDto.firstPaymentDate,
    );
  }

  @Post('leads')
  async createOrUpdateLead(@Body() createUpdateLeadDto: CreateUpdateLeadDto) {
    return this.externalApiService.createOrUpdateLead(createUpdateLeadDto);
  }

  @Post('clients-and-guarantors')
  async createClientAndGuarantor(@Body() clientGuarantorDto: CreateClientAndGuarantorDto) {
    return this.externalApiService.createClientAndGuarantor({
      createClient: clientGuarantorDto.createClient,
      createGuarantor: clientGuarantorDto.createGuarantor,
      createSecondaryClient: clientGuarantorDto.createSecondaryClient,
      document: clientGuarantorDto.document,
      userId: this.EXTERNAL_USER_ID,
    });
  }

  @Post('sales')
  async createSale(@Body() createSaleDto: CreateSaleDto) {
    return this.externalApiService.createSale(
      createSaleDto,
      this.EXTERNAL_USER_ID,
    );
  }

  @Get('sales')
  async findAllSales(@Query() paginationDto: PaginationDto) {
    return this.externalApiService.findAllSales(paginationDto);
  }

  @Get('sales/:id')
  async findOneSaleById(@Param('id') id: string) {
    return this.externalApiService.findOneSaleById(id);
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
    return this.externalApiService.createPaymentSale(
      id,
      createPaymentSaleDto,
      files,
      user.id,
    );
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
      return this.externalApiService.paidInstallments(
        financingId,
        paidInstallmentsDto.amountPaid,
        paidInstallmentsDto.payments,
        files,
        user.id
      );
    }
}