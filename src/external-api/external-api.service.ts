import { Injectable } from '@nestjs/common';
import { CreateClientDto } from 'src/admin-sales/clients/dto/create-client.dto';
import { CreateGuarantorDto } from 'src/admin-sales/guarantors/dto/create-guarantor.dto';
import { CreateSaleDto } from 'src/admin-sales/sales/dto/create-sale.dto';
import { FindAllLotsDto } from 'src/admin-sales/sales/dto/find-all-lots.dto';
import { CalculateAmortizationResponse } from 'src/admin-sales/sales/interfaces/calculate-amortization-response.interface';
import { ClientAndGuarantorResponse } from 'src/admin-sales/sales/interfaces/client-and-guarantor-response.interface';
import { SaleResponse } from 'src/admin-sales/sales/interfaces/sale-response.interface';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { CreateSecondaryClientDto } from 'src/admin-sales/secondary-client/dto/create-secondary-client.dto';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { Paginated } from 'src/common/interfaces/paginated.interface';
import { CreateUpdateLeadDto } from 'src/lead/dto/create-update-lead.dto';
import { Lead } from 'src/lead/entities/lead.entity';
import { LeadService } from 'src/lead/services/lead.service';
import { LotDetailResponseDto } from 'src/project/dto/lot.dto';
import { ProjectListResponseDto } from 'src/project/dto/project-list.dto';
import { BlockResponse } from 'src/project/interfaces/block-response.interface';
import { LotResponse } from 'src/project/interfaces/lot-response.interface';
import { StageResponse } from 'src/project/interfaces/stage-response.interface';
import { BlockService } from 'src/project/services/block.service';
import { LotService } from 'src/project/services/lot.service';
import { ProjectService } from 'src/project/services/project.service';
import { StageService } from 'src/project/services/stage.service';

@Injectable()
export class ExternalApiService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly stageService: StageService,
    private readonly blockService: BlockService,
    private readonly lotService: LotService,
    private readonly salesService: SalesService,
    private readonly leadService: LeadService,
  ) {}

  async getProjects(): Promise<ProjectListResponseDto> {
    return await this.projectService.findAll();
  }

  async getStages(projectId: string): Promise<StageResponse[]> {
    return await this.stageService.findAllByProjectId(projectId);
  }

  async getBlocks(stageId: string): Promise<BlockResponse[]> {
    return await this.blockService.findAllByStageId(stageId);
  }

  async getLots(blockId: string): Promise<LotResponse[]> {
    return await this.lotService.findAllByBlockId(blockId);
  }

  async findLotsByProjectId(
    projectId: string,
    findAllLotsDto: FindAllLotsDto
  ): Promise<Paginated<LotDetailResponseDto>> {
    return await this.lotService.findLotsByProjectId(projectId, findAllLotsDto);
  }
  
  calculeAmortization(
    totalAmount: number, 
    initialAmount: number, 
    reservationAmount: number, 
    interestRate: number, 
    numberOfPayments: number, 
    firstPaymentDate: string
  ): CalculateAmortizationResponse {
    return this.salesService.calculateAmortization({
      totalAmount,
      initialAmount,
      reservationAmount,
      interestRate,
      numberOfPayments,
      firstPaymentDate,
    });
  }

  async createOrUpdateLead(
      createUpdateDto: CreateUpdateLeadDto,
    ): Promise<Lead> {
    return await this.leadService.createOrUpdateLead(createUpdateDto);
  }

  async createClientAndGuarantor(data: {
    createClient: CreateClientDto,
    createGuarantor?: CreateGuarantorDto,
    createSecondaryClient?: CreateSecondaryClientDto[],
    document: string,
    userId: string
  }): Promise<ClientAndGuarantorResponse> {
    return await this.salesService.createClientAndGuarantor(data);
  }

  async createSale (
    createSaleDto: CreateSaleDto,
    userId: string,
  ): Promise<SaleResponse> {
    return await this.salesService.create(createSaleDto, userId);
  }

  async findAllSales(
    paginationDto: PaginationDto,
  ): Promise<Paginated<SaleResponse>> {
    return await this.salesService.findAll(paginationDto);
  }

  async findOneSaleById(
    id: string,
  ): Promise<SaleResponse> {
    return await this.salesService.findOneById(id);
  }
}
