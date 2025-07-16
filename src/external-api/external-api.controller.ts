import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ExternalApiService } from "./external-api.service";
import { FindAllLotsDto } from "src/admin-sales/sales/dto/find-all-lots.dto";
import { CalculateAmortizationDto } from "src/admin-sales/financing/dto/calculate-amortizacion-dto";
import { CreateUpdateLeadDto } from "src/lead/dto/create-update-lead.dto";
import { CreateClientAndGuarantorDto } from "src/admin-sales/sales/dto/create-client-and-guarantor.dto";
import { CreateSaleDto } from "src/admin-sales/sales/dto/create-sale.dto";
import { PaginationDto } from "src/common/dto/paginationDto";

@Controller('external')
@UseGuards(ApiKeyGuard) 
export class ExternalApiController {
  private readonly EXTERNAL_USER_ID = 'external-api-system';
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('projects')
  async getProjects() {
    return this.externalApiService.getProjects();
  }

  @Get('projects/:projectId/stages')
  async getStages(@Param('projectId') projectId: string) {
    return this.externalApiService.getStages(projectId);
  }

  @Get('stages/:stageId/blocks')
  async getBlocks(@Param('stageId') stageId: string) {
    return this.externalApiService.getBlocks(stageId);
  }

  @Get('blocks/:blockId/lots')
  async getLots(@Param('blockId') blockId: string) {
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
}