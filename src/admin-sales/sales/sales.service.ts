import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { QueryRunner, Repository } from 'typeorm';
import { LeadService } from 'src/lead/services/lead.service';
import { FindAllLeadsByDayDto } from './dto/find-all-leads-by-day.dto';
import { formatFindAllLedsByDayResponse } from './helpers/format-find-all-leds-by-day-response.helper';
import { PaginationHelper } from 'src/common/helpers/pagination.helper';
import { Paginated } from 'src/common/interfaces/paginated.interface';
import { LeadsByDayResponse } from './interfaces/leads-by-day-response.interface';
import { AssignLeadsToVendorDto } from './dto/assign-leads-to-vendor.dto';
import { UsersService } from 'src/user/user.service';
import { AllVendorsActivesResponse } from './interfaces/all-vendors-actives-response.interface';
import { formatFindAllVendors } from './helpers/format-find-all-vendors.helper';
import { ProjectService } from 'src/project/services/project.service';
import { FindAllActiveProjectsResponse } from 'src/project/interfaces/find-all-active-projects-response.interface';
import { formatAllActiveProjects } from './helpers/format-all-active-projects.helper.';
import { StageResponse } from 'src/project/interfaces/stage-response.interface';
import { StageService } from 'src/project/services/stage.service';
import { BlockService } from 'src/project/services/block.service';
import { BlockResponse } from 'src/project/interfaces/block-response.interface';
import { LotResponse } from 'src/project/interfaces/lot-response.interface';
import { LotService } from 'src/project/services/lot.service';
import { FindAllLotsDto } from './dto/find-all-lots.dto';
import { formatLotResponse } from 'src/project/helpers/format-lot-response.helper';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { SaleType } from './enums/sale-type.enum';
import { ClientsService } from '../clients/clients.service';
import { DirectPaymentSaleDto } from './dto/direct-payment-sale.dto';
import { TransactionService } from 'src/common/services/transaction.service';
import { FinancingType } from '../financing/enums/financing-type.enum';
import { FinancingService } from '../financing/services/financing.service';
import { CalculateAmortizationDto } from '../financing/dto/calculate-amortizacion-dto';
import { CreateFinancingInstallmentsDto } from '../financing/dto/create-financing-installments.dto';
import { GuarantorsService } from '../guarantors/guarantors.service';
import { Guarantor } from '../guarantors/entities/guarantor.entity';
import { CreateGuarantorDto } from '../guarantors/dto/create-guarantor.dto';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { Client } from '../clients/entities/client.entity';
import { GuarantorResponse } from '../guarantors/interfaces/guarantor-response.interface';
import { ClientResponse } from '../clients/interfaces/client-response.interface';
import { formatClientResponse } from '../clients/helpers/format-client-response.helper';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly leadService: LeadService,
    private readonly userService: UsersService,
    private readonly projectService: ProjectService,
    private readonly stageService: StageService,
    private readonly blockService: BlockService,
    private readonly lotService: LotService,
    private readonly clientService: ClientsService,
    private readonly transactionService: TransactionService,
    private readonly financingService: FinancingService,
    private readonly guarantorService: GuarantorsService,
  ) {}
  // TODO: Implementar la API de ventas
  async create(
    createSaleDto: CreateSaleDto,
    userId: string,
  ) {
    const { clientId, lotId } = createSaleDto;
    await this.clientService.isValidClient(clientId);
    await this.lotService.isLotValidForSale(lotId);
    // Crear venta
    const { saleType, initialAmount, interestRate, paymentReference, ...restData  } = createSaleDto;
    if (saleType === SaleType.DIRECT_PAYMENT)
      return this.directPaymentSale(createSaleDto, userId);
    if (saleType === SaleType.FINANCED)
      return this.refinancedSale(createSaleDto, userId);
  }

  async findAllLeadsByDay(
    findAllLeadsByDayDto: FindAllLeadsByDayDto,
  ): Promise<Paginated<LeadsByDayResponse>> {
    const {
      day,
      page = 1,
      limit = 10,
      order = 'DESC',
    } = findAllLeadsByDayDto;
    const paginationDto = { page, limit, order };
    const leads = await this.leadService.findAllByDay(day? new Date(day) : new Date());
    return PaginationHelper.createPaginatedResponse(
      leads.map(formatFindAllLedsByDayResponse),
      leads.length,
      paginationDto
    );
  }

  async assignLeadsToVendor(
    assignLeadsToVendorDto: AssignLeadsToVendorDto,
  ): Promise<LeadsByDayResponse[]> {
    const { leadsId, vendorId } = assignLeadsToVendorDto;
    const leads = await this.leadService.assignLeadsToVendor(leadsId, vendorId);
    return leads.map(formatFindAllLedsByDayResponse);
  }

  async findAllVendors(): Promise<AllVendorsActivesResponse[]> {
    const vendors = await this.userService.findAllVendors();
    return vendors.map(formatFindAllVendors);
  }

  async findAllActiveProjects(): Promise<FindAllActiveProjectsResponse[]> {
    const projects = await this.projectService.findAllActiveProjects();
    return projects.map(formatAllActiveProjects);
  }

  async findAllStagesByProjectId(
    projectId: string,
  ): Promise<StageResponse[]> {
    return await this.stageService.findAllByProjectId(projectId);
  }

  async findAllBlocksByStageId(stageId: string): Promise<BlockResponse[]> {
    return await this.blockService.findAllByStageId(stageId);
  }

  async findAllLotsByBlockId(
    blockId: string,
    findAllLotsDto: FindAllLotsDto,
  ): Promise<LotResponse[]> {
    const { status } = findAllLotsDto;
    const lots = await this.lotService.findAllByBlockId(blockId, status);
    return lots.map(formatLotResponse);
  }

  async findAllLeadsByUser(
    userId: string,
  ): Promise<LeadsByDayResponse[]> {
    const leads = await this.leadService.findAllByUser(userId);
    const leadsFormatted = leads.map(formatFindAllLedsByDayResponse);
    return leadsFormatted.map( lead => {
      const { vendor, ...rest } = lead;
      return rest;
    });
  }

  async findOneGuarantorById(id: number): Promise<Guarantor> { 
    return await this.guarantorService.findOneById(id);
  }

  async createGuarantor(createGuarantorDto: CreateGuarantorDto): Promise<GuarantorResponse> {
    return await this.guarantorService.create(createGuarantorDto);
  }

  async findOneClientById(id: number): Promise<Client> {
    return await this.clientService.findOneById(id);
  }

  async createClient(createClientDto: CreateClientDto, userId: string): Promise<ClientResponse> {
    return await this.clientService.create(createClientDto, userId);
  }

  async calculateAmortization(
    calculateAmortizationDto: CalculateAmortizationDto,
  ): Promise<any> {
    const installments = this.financingService.generateAmortizationTable(
      calculateAmortizationDto.principalAmount,
      calculateAmortizationDto.interestRate,
      calculateAmortizationDto.numberOfPayments,
      calculateAmortizationDto.firstPaymentDate,
      calculateAmortizationDto.includeDecimals,
    );
    return {
      installments: installments.map((installment) => {
        const { couteAmount, expectedPaymentDate } = installment;
        return {
          couteAmount: couteAmount,
          expectedPaymentDate: expectedPaymentDate,
        };
      }),
    };
  }

  // Internal helpers methods
  async createSale(
    createSaleDto: CreateSaleDto,
    userId: string,
    financingId: number,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner 
      ? queryRunner.manager.getRepository(Sale) 
      : this.saleRepository;
    const sale = repository.create({
      lot: { id: createSaleDto.lotId },
      client: { id: createSaleDto.clientId },
      type: createSaleDto.saleType,
      reservation: createSaleDto.reservationId 
      ? { id: createSaleDto.reservationId } 
      : undefined,
      vendor: { id: userId },
      totalAmount: createSaleDto.totalAmount,
      saleDate: createSaleDto.saleDate,
      contractDate: createSaleDto.contractDate,
      financing: { id: financingId },
    });
    await repository.save(sale);

  }

  async directPaymentSale(
    createSaleDto: CreateSaleDto,
    userId: string,
  ) {
    const financingData = { 
      financingType: FinancingType.DEBITO,
      initialAmount: createSaleDto.totalAmount,
      interestRate: 0,
      quantitySaleCoutes: 1,
      initialPaymentDate: new Date().toISOString(),
      financingInstallments: [{
        couteAmount: createSaleDto.totalAmount,
        expectedPaymentDate: new Date().toISOString(),
      }]
    }
    await this.transactionService.runInTransaction(async (queryRunner) => {
      const financing =
        await this.financingService.create(financingData, queryRunner);
      await this.createSale(createSaleDto, userId, financing.id, queryRunner);
    });
  }

  async refinancedSale(createSaleDto: CreateSaleDto,
    userId: string,
  ) {
    const { initialAmount, interestRate, quantitySaleCoutes, paymentDate, financingInstallments } = createSaleDto;
    this.isValidFinancingDataSaLe(
      initialAmount,
      interestRate,
      quantitySaleCoutes,
      financingInstallments
    )
    const financingData = { 
      financingType: FinancingType.CREDITO,
      initialAmount,
      interestRate,
      quantitySaleCoutes,
      initialPaymentDate: paymentDate,
      financingInstallments: financingInstallments
    }
    await this.transactionService.runInTransaction(async (queryRunner) => {
      const financing =
        await this.financingService.create(financingData, queryRunner);
      await this.createSale(createSaleDto, userId, financing.id, queryRunner);
    });
  }

  private isValidFinancingDataSaLe(
    initialAmount: number,
    interestRate: number,
    quantitySaleCoutes: number,
    financingInstallments: CreateFinancingInstallmentsDto[],
  ): void {
    if (!initialAmount)
      throw new BadRequestException('El monto inicial de la financiación es requerido');
    if (!interestRate)
      throw new BadRequestException('El porcentaje de interés es requerido');
    if (!quantitySaleCoutes)
      throw new BadRequestException('La cantidad de cuotas es requerido');
    if (!financingInstallments)
      throw new BadRequestException('La cantidad de cuotas de financiación es requerida');
  }

}
