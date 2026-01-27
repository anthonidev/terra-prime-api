import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { In, MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
import { LeadService } from 'src/lead/services/lead.service';
import { LeadVisit } from 'src/lead/entities/lead-visit.entity';
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
import { SaleType } from './enums/sale-type.enum';
import { ClientsService } from '../clients/clients.service';
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
import { UrbanDevelopmentService } from '../urban-development/urban-development.service';
import { CalculateAmortizationResponse } from './interfaces/calculate-amortization-response.interface';
import { ReservationsService } from '../reservations/reservations.service';
import { validateSaleDates } from './helpers/validate-sale-dates.helper';
import { LotStatus } from 'src/project/entities/lot.entity';
import { ClientSaleResponse } from '../clients/interfaces/client-sale-response.interface';
import { formatClientAndGuarantorResponse } from './helpers/format-client-and-guarantor-response.helper';
import { ClientAndGuarantorResponse } from './interfaces/client-and-guarantor-response.interface';
import { StatusReservation } from '../reservations/enums/status-reservation.enum';
import { formatSaleResponse } from './helpers/format-sale-response.helper';
import { formatSaleListResponse } from './helpers/format-sale-list-response.helper';
import { formatSaleVendorResponse } from './helpers/format-sale-vendor-response.helper';
import { SaleResponse } from './interfaces/sale-response.interface';
import {
  SaleWithCombinedInstallmentsResponse,
  FinancingDetail,
  FinancingInstallmentDetail,
} from './interfaces/sale-with-combined-installments-response.interface';
import { CombinedInstallmentWithPayments } from './interfaces/combined-installment-with-payments.interface';
import { InstallmentWithPayments } from '../financing/interfaces/installment-with-payments.interface';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { PaymentsService } from 'src/admin-payments/payments/services/payments.service';
import { CreatePaymentDto } from 'src/admin-payments/payments/dto/create-payment.dto';
import { PaymentResponse } from 'src/admin-payments/payments/interfaces/payment-response.interface';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { StatusSale } from './enums/status-sale.enum';
import { CreatePaymentSaleDto } from './dto/create-payment-sale.dto';
import { Financing } from '../financing/entities/financing.entity';
import { CreateSecondaryClientDto } from '../secondary-client/dto/create-secondary-client.dto';
import { SecondaryClientService } from '../secondary-client/secondary-client.service';
import { Reservation } from '../reservations/entities/reservation.entity';
import { formatSaleCollectionResponse } from './helpers/format-sale-collection-response.helper';
import { AssignParticipantsToSaleDto } from './dto/assign-participants-to-sale.dto';
import { ParticipantsService } from '../participants/participants.service';
import { ParticipantType } from '../participants/entities/participant.entity';
import { LotDetailResponseDto } from 'src/project/dto/lot.dto';
import { transformLotToDetail } from 'src/project/helpers/transform-lot-to-detail.helper';
import { UpdateReservationPeriodResponseDto } from './dto/update-reservation-period.dto';
import { FinancingInstallmentsService } from '../financing/services/financing-installments.service';
import { LeadWithParticipantsResponse } from 'src/lead/interfaces/lead-formatted-response.interface';
import { Lead } from 'src/lead/entities/lead.entity';
import { AdminTokenService } from 'src/project/services/admin-token.service';
import { CombinedAmortizationResponse } from '../financing/interfaces/combined-amortization-response.interface';
import * as XLSX from 'xlsx';
import { transformSaleToExcelRows } from './helpers/sale-to-excel.helper';
import { createSmartExcelWorkbook } from './helpers/sale-to-excel-smart.helper';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { FinancingInstallments } from '../financing/entities/financing-installments.entity';
import { StatusFinancingInstallments } from '../financing/enums/status-financing-installments.enum';
import { FinancingAmendmentHistory } from '../financing/entities/financing-amendment-history.entity';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { createAmendmentHistoryExcel } from './helpers/amendment-history-excel.helper';
import {
  CreateFinancingAmendmentDto,
  AmendmentInstallmentStatus,
} from './dto/create-financing-amendment.dto';
import Decimal from 'decimal.js';

// SERVICIO ACTUALIZADO - UN SOLO ENDPOINT PARA VENTA/RESERVA

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(FinancingAmendmentHistory)
    private readonly amendmentHistoryRepository: Repository<FinancingAmendmentHistory>,
    private readonly leadService: LeadService,
    private readonly userService: UsersService,
    private readonly projectService: ProjectService,
    private readonly stageService: StageService,
    private readonly blockService: BlockService,
    private readonly lotService: LotService,
    private readonly clientService: ClientsService,
    private readonly transactionService: TransactionService,
    private readonly financingService: FinancingService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    private readonly guarantorService: GuarantorsService,
    @Inject(forwardRef(() => UrbanDevelopmentService))
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
    // ELIMINAR: private readonly reservationService: ReservationsService,
    private readonly paymentsService: PaymentsService,
    private readonly secondaryClientService: SecondaryClientService,
    private readonly participantsService: ParticipantsService,
    private readonly adminTokenService: AdminTokenService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(
    createSaleDto: CreateSaleDto,
    userId: string,
  ): Promise<SaleWithCombinedInstallmentsResponse> {
    try {
      // Separar el array combinado en dos arrays: lote y HU
      if (
        createSaleDto.combinedInstallments &&
        createSaleDto.combinedInstallments.length > 0
      ) {
        const lotInstallments: CreateFinancingInstallmentsDto[] = [];
        const huInstallments: CreateFinancingInstallmentsDto[] = [];

        for (const combined of createSaleDto.combinedInstallments) {
          // Agregar cuota de lote si existe
          if (
            combined.lotInstallmentAmount !== null &&
            combined.lotInstallmentAmount !== undefined
          ) {
            lotInstallments.push({
              couteAmount: combined.lotInstallmentAmount,
              expectedPaymentDate: combined.expectedPaymentDate,
            });
          }

          // Agregar cuota de HU si existe
          if (
            combined.huInstallmentAmount !== null &&
            combined.huInstallmentAmount !== undefined
          ) {
            huInstallments.push({
              couteAmount: combined.huInstallmentAmount,
              expectedPaymentDate: combined.expectedPaymentDate,
            });
          }
        }

        // Asignar los arrays separados al DTO
        createSaleDto.financingInstallments = lotInstallments;
        createSaleDto.financingInstallmentsHu =
          huInstallments.length > 0 ? huInstallments : undefined;
      }

      const {
        clientId,
        lotId,
        guarantorId,
        firstPaymentDateHu,
        secondaryClientsIds = [],
        // Campos de reserva
        reservationAmount,
        maximumHoldPeriod,
        isReservation,
      } = createSaleDto;

      validateSaleDates({ firstPaymentDateHu });

      // Validar lote disponible
      await this.lotService.isLotValidForSale(lotId);

      if (isReservation)
        await this.validateReservationData(
          reservationAmount,
          maximumHoldPeriod,
        );

      const client = await this.clientService.isValidClient(clientId);
      // Validaciones comunes
      await Promise.all([
        guarantorId
          ? this.guarantorService.isValidGuarantor(guarantorId)
          : null,
        ...secondaryClientsIds.map((id) =>
          this.secondaryClientService.isValidSecondaryClient(id),
        ),
      ]);

      const lead = client.lead;
      // Obtener la última visita del lead para los participantes
      const lastVisit = await this.leadService.findLastVisitByLeadId(lead.id);
      let sale;

      if (createSaleDto.saleType === SaleType.DIRECT_PAYMENT) {
        sale = await this.handleSaleCreation(
          createSaleDto,
          userId,
          async (queryRunner, data) => {
            return await this.createSale(
              data,
              userId,
              null,
              lastVisit,
              queryRunner,
            );
          },
        );
      }

      if (createSaleDto.saleType === SaleType.FINANCED) {
        sale = await this.handleSaleCreation(
          createSaleDto,
          userId,
          async (queryRunner, data) => {
            const {
              initialAmount,
              interestRate,
              quantitySaleCoutes,
              totalAmount,
              financingInstallments,
            } = data;

            // Log para debug
            console.log('=== VALIDACIÓN DE VENTA ===');
            console.log('totalAmount:', totalAmount);
            console.log(
              'totalAmountUrbanDevelopment:',
              data.totalAmountUrbanDevelopment,
            );
            console.log('initialAmount:', initialAmount);
            console.log('reservationAmount:', data.reservationAmount);

            this.isValidFinancingDataSale(
              totalAmount,
              data.reservationAmount || 0, // Usar reservationAmount del DTO
              initialAmount,
              interestRate,
              quantitySaleCoutes,
              financingInstallments,
              data.totalAmountUrbanDevelopment,
              data.quantityHuCuotes,
              data.financingInstallmentsHu,
              data.firstPaymentDateHu,
            );

            const financingData = {
              financingType: FinancingType.CREDITO,
              initialAmount,
              interestRate,
              quantityCoutes: quantitySaleCoutes,
              financingInstallments: financingInstallments,
            };

            const financingSale = await this.financingService.create(
              financingData,
              queryRunner,
              data.reservationAmount || 0, // Pasar reservationAmount para calcular pending
            );
            return await this.createSale(
              data,
              userId,
              financingSale.id,
              lastVisit,
              queryRunner,
            );
          },
        );
      }

      return await this.findOneById(sale.id);
    } catch (error) {
      throw error;
    }
  }

  private async handleSaleCreation(
    createSaleDto: CreateSaleDto,
    userId: string,
    saleSpecificLogic: (
      queryRunner: QueryRunner,
      createSaleDto: CreateSaleDto,
    ) => Promise<Sale>,
  ) {
    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        const savedSale = await saleSpecificLogic(queryRunner, createSaleDto);

        // Agregar clientes secundarios
        const { secondaryClientsIds } = createSaleDto;
        if (secondaryClientsIds && secondaryClientsIds.length > 0) {
          await Promise.all(
            createSaleDto.secondaryClientsIds.map(async (id) => {
              const secondaryClientSale =
                await this.secondaryClientService.createSecondaryClientSale(
                  savedSale.id,
                  id,
                  queryRunner,
                );
              return secondaryClientSale;
            }),
          );
        }

        // Actualizar estado del lote
        const lotStatus = savedSale.fromReservation
          ? LotStatus.RESERVED
          : LotStatus.SOLD;
        await this.lotService.updateStatus(
          savedSale.lot.id,
          lotStatus,
          queryRunner,
        );

        // Manejar habilitación urbana si corresponde
        if (createSaleDto.totalAmountUrbanDevelopment === 0) return savedSale;

        this.isValidUrbanDevelopmentDataSale(
          createSaleDto.firstPaymentDateHu,
          createSaleDto.initialAmountUrbanDevelopment,
          createSaleDto.quantityHuCuotes,
        );

        const financingDataHu =
          this.calculateAndCreateFinancingHu(createSaleDto);
        const financingHu = await this.financingService.create(
          financingDataHu,
          queryRunner,
          0, // Urban Development no tiene reserva
        );
        await this.createUrbanDevelopment(
          savedSale.id,
          financingHu.id,
          createSaleDto,
          queryRunner,
        );

        return savedSale;
      },
    );
  }

  async createSale(
    createSaleDto: CreateSaleDto,
    userId: string,
    financingId?: string,
    leadVisit?: LeadVisit,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Sale)
      : this.saleRepository;

    const reservationAmount = createSaleDto.reservationAmount || 0;
    const totalAmount = createSaleDto.totalAmount || 0;

    const sale = repository.create({
      lot: { id: createSaleDto.lotId },
      client: { id: createSaleDto.clientId },
      guarantor: createSaleDto.guarantorId
        ? { id: createSaleDto.guarantorId }
        : null,
      type: createSaleDto.saleType,
      vendor: { id: userId },
      totalAmount: totalAmount,
      contractDate: createSaleDto.contractDate,
      financing: financingId ? { id: financingId } : null,
      metadata: createSaleDto?.metadata || null,
      notes: createSaleDto?.notes || null,
      applyLateFee: createSaleDto?.applyLateFee ?? true,
      // Campos de reserva
      fromReservation: createSaleDto.isReservation,
      reservationAmount: createSaleDto.isReservation ? reservationAmount : null,
      reservationAmountPaid: 0,
      reservationAmountPending: createSaleDto.isReservation
        ? reservationAmount
        : null,
      maximumHoldPeriod: createSaleDto.maximumHoldPeriod || null,
      // Campos de pago total (para venta directa)
      totalAmountPaid: 0,
      totalAmountPending:
        createSaleDto.saleType === SaleType.DIRECT_PAYMENT &&
        !createSaleDto.isReservation
          ? totalAmount
          : createSaleDto.saleType === SaleType.DIRECT_PAYMENT &&
              createSaleDto.isReservation
            ? totalAmount - reservationAmount
            : null,
      status: createSaleDto.isReservation
        ? StatusSale.RESERVATION_PENDING
        : StatusSale.PENDING,
      // Asignar leadVisit si existe
      leadVisit: leadVisit ? { id: leadVisit.id } : null,
      // Participantes desde la última visita
      liner: leadVisit?.linerParticipant || null,
      telemarketingSupervisor: leadVisit?.telemarketingSupervisor || null,
      telemarketingConfirmer: leadVisit?.telemarketingConfirmer || null,
      telemarketer: leadVisit?.telemarketer || null,
      fieldManager: leadVisit?.fieldManager || null,
      fieldSupervisor: leadVisit?.fieldSupervisor || null,
      fieldSeller: leadVisit?.fieldSeller || null,
      salesManager: leadVisit?.salesManager || null,
      salesGeneralManager: leadVisit?.salesGeneralManager || null,
      postSale: leadVisit?.postSale || null,
      closer: leadVisit?.closer || null,
    });

    return await repository.save(sale);
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
  ): Promise<Paginated<SaleResponse>> {
    const { page = 1, limit = 10, order = 'DESC' } = paginationDto;
    const skip = (page - 1) * limit;

    let queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
      )
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .leftJoinAndSelect('sale.liner', 'liner')
      .leftJoinAndSelect(
        'sale.telemarketingSupervisor',
        'telemarketingSupervisor',
      )
      .leftJoinAndSelect(
        'sale.telemarketingConfirmer',
        'telemarketingConfirmer',
      )
      .leftJoinAndSelect('sale.telemarketer', 'telemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'fieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'fieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'fieldSeller')
      .leftJoinAndSelect('sale.salesGeneralManager', 'salesGeneralManager')
      .leftJoinAndSelect('sale.salesManager', 'salesManager')
      .leftJoinAndSelect('sale.postSale', 'postSale')
      .leftJoinAndSelect('sale.closer', 'closer');

    if (userId) {
      queryBuilder.where('vendor.id = :userId', { userId });
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      queryBuilder.where('sale.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });
    }

    const totalCount = await queryBuilder.getCount();
    const sales = await queryBuilder
      .orderBy('sale.createdAt', order)
      .skip(skip)
      .take(limit)
      .getMany();

    const formattedSales = sales.map(formatSaleResponse);
    return PaginationHelper.createPaginatedResponse(
      formattedSales,
      totalCount,
      paginationDto,
    );
  }

  async findAllWithFilters(
    findAllSalesDto: any,
    userId?: string,
  ): Promise<Paginated<any>> {
    const {
      page = 1,
      limit = 10,
      order = 'DESC',
      status,
      type,
      projectId,
      clientName,
    } = findAllSalesDto;
    const skip = (page - 1) * limit;

    let queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.leadVisit', 'leadVisit')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('sale.urbanDevelopment', 'urbanDevelopment')
      .leftJoinAndSelect(
        'urbanDevelopment.financing',
        'urbanDevelopmentFinancing',
      )
      .leftJoinAndSelect('sale.liner', 'liner')
      .leftJoinAndSelect(
        'sale.telemarketingSupervisor',
        'telemarketingSupervisor',
      )
      .leftJoinAndSelect(
        'sale.telemarketingConfirmer',
        'telemarketingConfirmer',
      )
      .leftJoinAndSelect('sale.telemarketer', 'telemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'fieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'fieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'fieldSeller')
      .leftJoinAndSelect('sale.salesGeneralManager', 'salesGeneralManager')
      .leftJoinAndSelect('sale.salesManager', 'salesManager')
      .leftJoinAndSelect('sale.postSale', 'postSale')
      .leftJoinAndSelect('sale.closer', 'closer');

    if (userId) {
      queryBuilder.andWhere('vendor.id = :userId', { userId });
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      queryBuilder.andWhere('sale.createdAt >= :thirtyDaysAgo', {
        thirtyDaysAgo,
      });
    }

    if (status) {
      queryBuilder.andWhere('sale.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('sale.type = :type', { type });
    }

    if (projectId) {
      queryBuilder.andWhere('project.id = :projectId', { projectId });
    }

    if (clientName) {
      queryBuilder.andWhere(
        '(LOWER(lead.firstName) LIKE LOWER(:clientName) OR LOWER(lead.lastName) LIKE LOWER(:clientName) OR LOWER(lead.document) LIKE LOWER(:clientName))',
        { clientName: `%${clientName}%` },
      );
    }

    const totalCount = await queryBuilder.getCount();
    const sales = await queryBuilder
      .orderBy('sale.createdAt', order)
      .skip(skip)
      .take(limit)
      .getMany();

    const formattedSales = sales.map((sale) => formatSaleListResponse(sale));
    return PaginationHelper.createPaginatedResponse(
      formattedSales,
      totalCount,
      findAllSalesDto,
    );
  }

  async findAllVendorWithFilters(
    findAllSalesDto: any,
    userId: string,
  ): Promise<Paginated<any>> {
    const {
      page = 1,
      limit = 10,
      order = 'DESC',
      status,
      type,
      projectId,
      clientName,
    } = findAllSalesDto;
    const skip = (page - 1) * limit;

    let queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.leadVisit', 'leadVisit')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('sale.urbanDevelopment', 'urbanDevelopment')
      .leftJoinAndSelect(
        'urbanDevelopment.financing',
        'urbanDevelopmentFinancing',
      )
      .andWhere('sale.vendor = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('sale.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('sale.type = :type', { type });
    }

    if (projectId) {
      queryBuilder.andWhere('project.id = :projectId', { projectId });
    }

    if (clientName) {
      queryBuilder.andWhere(
        '(LOWER(lead.firstName) LIKE LOWER(:clientName) OR LOWER(lead.lastName) LIKE LOWER(:clientName) OR LOWER(lead.document) LIKE LOWER(:clientName))',
        { clientName: `%${clientName}%` },
      );
    }

    const totalCount = await queryBuilder.getCount();
    const sales = await queryBuilder
      .orderBy('sale.createdAt', order)
      .skip(skip)
      .take(limit)
      .getMany();

    const formattedSales = sales.map((sale) => formatSaleVendorResponse(sale));
    return PaginationHelper.createPaginatedResponse(
      formattedSales,
      totalCount,
      findAllSalesDto,
    );
  }

  // ACTUALIZAR MÉTODO DE PAGO
  private async isValidDataPaymentSale(
    sale: SaleWithCombinedInstallmentsResponse,
    paymentDetails: CreateDetailPaymentDto[],
  ): Promise<CreatePaymentDto> {
    let paymentDto: CreatePaymentDto;

    // Calcular monto total del pago basado en los detalles
    const totalPaymentAmount = paymentDetails.reduce(
      (sum, detail) => sum + detail.amount,
      0,
    );

    // Validar que el monto sea positivo
    if (totalPaymentAmount <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0');
    }

    // ========== PAGO DE RESERVA ==========
    if (
      sale.status === StatusSale.RESERVATION_PENDING ||
      sale.status === StatusSale.RESERVATION_IN_PAYMENT
    ) {
      if (!sale.reservationAmount)
        throw new BadRequestException(
          'No se encontró monto de reserva para esta venta',
        );

      // Calcular monto pendiente
      const amountPending = Number(
        (
          Number(sale.reservationAmount) -
          Number(sale.reservationAmountPaid || 0)
        ).toFixed(2),
      );

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de reserva ($${amountPending.toFixed(2)})`,
        );
      }

      paymentDto = {
        methodPayment: MethodPayment.VOUCHER,
        amount: totalPaymentAmount,
        relatedEntityType: 'reservation',
        relatedEntityId: sale.id,
        metadata: {
          'Concepto de pago': 'Pago de reserva de lote',
          'Fecha de pago': new Date().toISOString(),
          'Monto de pago': totalPaymentAmount,
          'Monto pendiente antes de pago': amountPending,
          'Monto de reserva': sale.reservationAmount,
          'Monto pagado de reserva': sale.reservationAmountPaid || 0,
        },
        paymentDetails,
      };
    }
    // ========== PAGO DE VENTA DIRECTA ==========
    else if (
      (sale.status === StatusSale.RESERVED ||
        sale.status === StatusSale.PENDING ||
        sale.status === StatusSale.IN_PAYMENT) &&
      sale.type === SaleType.DIRECT_PAYMENT
    ) {
      const reservationAmount =
        sale.fromReservation && sale.reservationAmount
          ? sale.reservationAmount
          : 0;
      const totalToPay = Number(
        (Number(sale.totalAmount) - Number(reservationAmount)).toFixed(2),
      );

      // Calcular monto pendiente
      const amountPending = Number(
        (totalToPay - Number(sale.totalAmountPaid || 0)).toFixed(2),
      );

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de la venta ($${amountPending.toFixed(2)})`,
        );
      }

      paymentDto = {
        methodPayment: MethodPayment.VOUCHER,
        amount: totalPaymentAmount,
        relatedEntityType: 'sale',
        relatedEntityId: sale.id,
        metadata: {
          'Concepto de pago': 'Pago de venta de lote',
          'Fecha de pago': new Date().toISOString(),
          'Monto de pago': totalPaymentAmount,
          'Monto pendiente antes de pago': amountPending,
          'Monto total de la venta': sale.totalAmount,
          'Monto total a pagar': totalToPay,
          'Monto total pagado': sale.totalAmountPaid || 0,
          'Monto de reserva': reservationAmount,
        },
        paymentDetails,
      };
    }
    // ========== PAGO INICIAL DE FINANCIAMIENTO ==========
    else if (
      (sale.status === StatusSale.RESERVED ||
        sale.status === StatusSale.PENDING ||
        sale.status === StatusSale.IN_PAYMENT) &&
      sale.type === SaleType.FINANCED
    ) {
      const reservationAmount =
        sale.fromReservation && sale.reservationAmount
          ? sale.reservationAmount
          : 0;
      const initialToPay = Number(
        (
          Number(sale.financing.lot.initialAmount) - Number(reservationAmount)
        ).toFixed(2),
      );

      // Calcular monto pendiente
      const amountPending = Number(
        (
          initialToPay - Number(sale.financing.lot.initialAmountPaid || 0)
        ).toFixed(2),
      );

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de la inicial ($${amountPending.toFixed(2)})`,
        );
      }

      paymentDto = {
        methodPayment: MethodPayment.VOUCHER,
        amount: totalPaymentAmount,
        relatedEntityType: 'financing',
        relatedEntityId: sale.financing.lot.id,
        metadata: {
          'Concepto de pago': 'Pago inicial de financiamiento',
          'Fecha de pago': new Date().toISOString(),
          'Monto de pago': totalPaymentAmount,
          'Monto pendiente antes de pago': amountPending,
          'Monto inicial': sale.financing.lot.initialAmount,
          'Monto inicial a pagar': initialToPay,
          'Monto inicial pagado': sale.financing.lot.initialAmountPaid || 0,
          'Monto de reserva': reservationAmount,
        },
        paymentDetails,
      };
    }
    // ========== VALIDACIONES DE ESTADOS QUE NO PERMITEN PAGOS ==========
    else if (sale.status === StatusSale.PENDING_APPROVAL) {
      throw new BadRequestException(
        'No se puede realizar pago porque la venta tiene un pago pendiente de aprobación',
      );
    } else if (sale.status === StatusSale.RESERVATION_PENDING_APPROVAL) {
      throw new BadRequestException(
        'No se puede realizar pago porque la reserva tiene un pago pendiente de aprobación',
      );
    } else if (sale.status === StatusSale.IN_PAYMENT_PROCESS) {
      throw new BadRequestException(
        'No se puede realizar pago directo desde la venta porque la venta está en proceso de pago de cuotas',
      );
    } else if (sale.status === StatusSale.COMPLETED) {
      throw new BadRequestException(
        'No se puede realizar pago porque la venta ya se ha completado',
      );
    } else if (sale.status === StatusSale.REJECTED) {
      throw new BadRequestException(
        'No se puede realizar pago porque la venta ha sido rechazada',
      );
    } else if (sale.status === StatusSale.WITHDRAWN) {
      throw new BadRequestException(
        'No se puede realizar pago porque la venta ha sido retirada',
      );
    } else {
      throw new BadRequestException(
        `No se puede realizar pago en el estado actual: ${sale.status}`,
      );
    }

    return paymentDto;
  }

  // ACTUALIZAR MÉTODO getPaymentsSummaryForSale
  private async getPaymentsSummaryForSale(saleId: string): Promise<any[]> {
    // Obtener la venta con todas las relaciones de financiamiento
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('sale.urbanDevelopment', 'urbanDevelopment')
      .leftJoinAndSelect(
        'urbanDevelopment.financing',
        'urbanDevelopmentFinancing',
      )
      .where('sale.id = :saleId', { saleId })
      .getOne();

    if (!sale)
      throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);

    // 1. Pagos directos a la venta
    const salePayments = await this.paymentsService.findPaymentsByRelatedEntity(
      'sale',
      saleId,
    );

    // 2. Pagos de financiación (inicial)
    let financingPayments = [];
    if (sale.financing) {
      financingPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financing',
          sale.financing.id,
        );
    }

    // 3. Pagos de cuotas (regulares y de HU)
    const installmentPayments = [];
    if (sale.financing) {
      const financingInstallmentPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financingInstallments',
          sale.financing.id,
        );
      installmentPayments.push(...financingInstallmentPayments);
    }
    if (sale.urbanDevelopment?.financing) {
      const huInstallmentPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financingInstallments',
          sale.urbanDevelopment.financing.id,
        );
      installmentPayments.push(...huInstallmentPayments);
    }

    // 4. Pagos de reserva
    let reservationPayments = [];
    if (sale.fromReservation || sale.reservationAmount > 0) {
      reservationPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'reservation',
          saleId,
        );
    }

    // Combinar todos los pagos
    const allPayments = [
      ...salePayments,
      ...financingPayments,
      ...reservationPayments,
      ...installmentPayments,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return allPayments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      reviewedAt: payment.reviewedAt,
      reviewBy: payment.reviewedBy
        ? {
            id: payment.reviewedBy.id,
            email: payment.reviewedBy.email,
          }
        : null,
      banckName: payment.banckName,
      dateOperation: payment.dateOperation,
      numberTicket: payment.numberTicket,
      paymentConfig: payment.paymentConfig.name,
      reason: payment?.rejectionReason ? payment.rejectionReason : null,
      metadata: payment.metadata, // Agregar metadata
    }));
  }

  // ACTUALIZAR TODOS LOS MÉTODOS findOne* PARA ELIMINAR RESERVATION JOINS
  async findOneById(id: string): Promise<SaleWithCombinedInstallmentsResponse> {
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
      )
      .leftJoinAndSelect('sale.urbanDevelopment', 'urbanDevelopment')
      .leftJoinAndSelect(
        'urbanDevelopment.financing',
        'urbanDevelopmentFinancing',
      )
      .leftJoinAndSelect(
        'urbanDevelopmentFinancing.financingInstallments',
        'urbanDevelopmentFinancingInstallments',
      )
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .leftJoinAndSelect('sale.liner', 'liner')
      .leftJoinAndSelect(
        'sale.telemarketingSupervisor',
        'telemarketingSupervisor',
      )
      .leftJoinAndSelect(
        'sale.telemarketingConfirmer',
        'telemarketingConfirmer',
      )
      .leftJoinAndSelect('sale.telemarketer', 'telemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'fieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'fieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'fieldSeller')
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale)
      throw new NotFoundException(
        `La venta con ID ${id} no se encuentra registrada`,
      );

    // Obtener resumen de pagos
    const paymentsSummary = await this.getPaymentsSummaryForSale(id);

    // Helper para construir FinancingDetail
    const buildFinancingDetail = (
      financing: typeof sale.financing,
    ): FinancingDetail => {
      const installments = financing.financingInstallments || [];

      // Calcular totales de las cuotas
      const totals = installments.reduce(
        (acc, inst) => ({
          totalCouteAmount: acc.totalCouteAmount + Number(inst.couteAmount),
          totalPaid: acc.totalPaid + Number(inst.coutePaid),
          totalPending: acc.totalPending + Number(inst.coutePending),
          totalLateFee: acc.totalLateFee + Number(inst.lateFeeAmount || 0),
          totalLateFeeePending:
            acc.totalLateFeeePending + Number(inst.lateFeeAmountPending || 0),
          totalLateFeePaid:
            acc.totalLateFeePaid + Number(inst.lateFeeAmountPaid || 0),
        }),
        {
          totalCouteAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          totalLateFee: 0,
          totalLateFeeePending: 0,
          totalLateFeePaid: 0,
        },
      );

      // Mapear cuotas al formato requerido
      const mappedInstallments: FinancingInstallmentDetail[] = installments
        .sort((a, b) => (a.numberCuote || 0) - (b.numberCuote || 0))
        .map((inst) => ({
          id: inst.id,
          numberCuote: inst.numberCuote,
          couteAmount: Number(inst.couteAmount),
          coutePending: Number(inst.coutePending),
          coutePaid: Number(inst.coutePaid),
          expectedPaymentDate: inst.expectedPaymentDate
            ? inst.expectedPaymentDate.toISOString()
            : null,
          lateFeeAmount: Number(inst.lateFeeAmount || 0),
          lateFeeAmountPending: Number(inst.lateFeeAmountPending || 0),
          lateFeeAmountPaid: Number(inst.lateFeeAmountPaid || 0),
          status: inst.status,
        }));

      return {
        id: financing.id,
        financingType: financing.financingType,
        initialAmount: Number(financing.initialAmount),
        initialAmountPaid: Number(financing.initialAmountPaid || 0),
        initialAmountPending: Number(financing.initialAmountPending || 0),
        interestRate: Number(financing.interestRate || 0),
        quantityCoutes: Number(financing.quantityCoutes),
        totalCouteAmount: parseFloat(totals.totalCouteAmount.toFixed(2)),
        totalPaid: parseFloat(totals.totalPaid.toFixed(2)),
        totalPending: parseFloat(totals.totalPending.toFixed(2)),
        totalLateFee: parseFloat(totals.totalLateFee.toFixed(2)),
        totalLateFeeePending: parseFloat(
          totals.totalLateFeeePending.toFixed(2),
        ),
        totalLateFeePaid: parseFloat(totals.totalLateFeePaid.toFixed(2)),
        installments: mappedInstallments,
      };
    };

    const formattedSale = formatSaleResponse(sale);

    // Calcular campos adicionales
    const reservationAmount =
      sale.fromReservation && sale.reservationAmount
        ? Number(sale.reservationAmount)
        : 0;
    const reservationAmountPaid = sale.reservationAmountPaid
      ? Number(sale.reservationAmountPaid)
      : 0;
    const totalAmountPaid = sale.totalAmountPaid
      ? Number(sale.totalAmountPaid)
      : 0;

    // totalToPay: para venta directa es totalAmount - reservationAmount, para financiada es el total del financiamiento
    let totalToPay = 0;
    if (sale.type === 'DIRECT_PAYMENT') {
      totalToPay = Number(sale.totalAmount) - reservationAmount;
    } else if (sale.type === 'FINANCED' && sale.financing) {
      // Para financiada, totalToPay es la suma de todas las cuotas más el inicial
      totalToPay = Number(sale.totalAmount) - reservationAmount;
    }

    return {
      id: formattedSale.id,
      type: formattedSale.type,
      totalAmount: formattedSale.totalAmount,
      totalAmountPaid,
      totalAmountPending: sale.totalAmountPending
        ? Number(sale.totalAmountPending)
        : null,
      totalToPay,
      contractDate: formattedSale.contractDate,
      status: formattedSale.status,
      currency: formattedSale.currency,
      createdAt: formattedSale.createdAt,
      reservationAmount: formattedSale.reservationAmount,
      reservationAmountPaid,
      reservationAmountPending: sale.reservationAmountPending
        ? Number(sale.reservationAmountPending)
        : null,
      maximumHoldPeriod: formattedSale.maximumHoldPeriod,
      fromReservation: formattedSale.fromReservation,
      client: {
        ...formattedSale.client,
        document: sale.client?.lead?.document ?? null,
      },
      secondaryClients: formattedSale.secondaryClients,
      lot: formattedSale.lot,
      radicationPdfUrl: formattedSale.radicationPdfUrl,
      paymentAcordPdfUrl: formattedSale.paymentAcordPdfUrl,
      financing: sale.financing
        ? {
            lot: buildFinancingDetail(sale.financing),
            hu: sale.urbanDevelopment?.financing
              ? buildFinancingDetail(sale.urbanDevelopment.financing)
              : undefined,
          }
        : undefined,
      guarantor: formattedSale.guarantor,
      liner: formattedSale.liner,
      telemarketingSupervisor: formattedSale.telemarketingSupervisor,
      telemarketingConfirmer: formattedSale.telemarketingConfirmer,
      telemarketer: formattedSale.telemarketer,
      fieldManager: formattedSale.fieldManager,
      fieldSupervisor: formattedSale.fieldSupervisor,
      fieldSeller: formattedSale.fieldSeller,
      vendor: formattedSale.vendor,
      paymentsSummary,
    };
  }

  // Método privado para combinar cuotas por fecha - MISMO formato que calculateAmortization
  private combinInstallmentsByDate(
    lotInstallments: InstallmentWithPayments[],
    huInstallments: InstallmentWithPayments[],
  ): CombinedInstallmentWithPayments[] {
    // Función helper para formatear fecha a YYYY-MM-DD
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Crear mapas por fecha con número de cuota
    const lotMap = new Map<string, { amount: number; number: number }>();
    lotInstallments.forEach((inst, index) => {
      const dateKey = formatDate(inst.expectedPaymentDate);
      lotMap.set(dateKey, {
        amount: Number(inst.couteAmount),
        number: index + 1,
      });
    });

    const huMap = new Map<string, { amount: number; number: number }>();
    huInstallments.forEach((inst, index) => {
      const dateKey = formatDate(inst.expectedPaymentDate);
      huMap.set(dateKey, {
        amount: Number(inst.couteAmount),
        number: index + 1,
      });
    });

    // Obtener todas las fechas únicas y ordenarlas
    const allDates = new Set<string>([
      ...Array.from(lotMap.keys()),
      ...Array.from(huMap.keys()),
    ]);
    const sortedDates = Array.from(allDates)
      .filter((d) => d)
      .sort();

    // Combinar por fecha - EXACTAMENTE como el cálculo de amortización
    const combined: CombinedInstallmentWithPayments[] = [];
    for (const date of sortedDates) {
      const lotData = lotMap.get(date);
      const huData = huMap.get(date);

      const lotInstallmentAmount = lotData ? lotData.amount : null;
      const lotInstallmentNumber = lotData ? lotData.number : null;
      const huInstallmentAmount = huData ? huData.amount : null;
      const huInstallmentNumber = huData ? huData.number : null;

      const totalInstallmentAmount = parseFloat(
        ((lotInstallmentAmount || 0) + (huInstallmentAmount || 0)).toFixed(2),
      );

      combined.push({
        lotInstallmentAmount,
        lotInstallmentNumber,
        huInstallmentAmount,
        huInstallmentNumber,
        expectedPaymentDate: date,
        totalInstallmentAmount,
      });
    }

    return combined;
  }

  async findOneByIdWithCollections(id: string): Promise<SaleResponse> {
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
      )
      .leftJoinAndSelect('sale.urbanDevelopment', 'urbanDevelopment')
      .leftJoinAndSelect(
        'urbanDevelopment.financing',
        'urbanDevelopmentFinancing',
      )
      .leftJoinAndSelect(
        'urbanDevelopmentFinancing.financingInstallments',
        'urbanDevelopmentFinancingInstallments',
      )
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale)
      throw new NotFoundException(
        `La venta con ID ${id} no se encuentra registrada`,
      );

    let installmentsWithPayments = [];
    if (sale.financing)
      installmentsWithPayments =
        await this.financingInstallmentsService.getInstallmentsWithPayments(
          sale.financing.id,
        );

    let huInstallmentsWithPayments = [];
    if (sale.urbanDevelopment?.financing)
      huInstallmentsWithPayments =
        await this.financingInstallmentsService.getInstallmentsWithPayments(
          sale.urbanDevelopment.financing.id,
        );

    const formattedSale = formatSaleResponse(sale);

    return {
      ...formattedSale,
      financing: sale.financing
        ? {
            ...formattedSale.financing,
            financingInstallments: installmentsWithPayments, // Reemplazar cuotas simples con cuotas + pagos
          }
        : undefined,
      urbanDevelopment: sale.urbanDevelopment
        ? {
            ...formattedSale.urbanDevelopment,
            financing: sale.urbanDevelopment.financing
              ? {
                  ...formattedSale.urbanDevelopment.financing,
                  financingInstallments: huInstallmentsWithPayments,
                }
              : undefined,
          }
        : undefined,
    };
  }

  async findAllByClient(clientId: number): Promise<SaleResponse[]> {
    const sales = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
      )
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .where('client.id = :clientId', { clientId })
      .andWhere('sale.type = :type', { type: SaleType.FINANCED })
      .andWhere('sale.status = :status', {
        status: StatusSale.IN_PAYMENT_PROCESS,
      })
      .orderBy('sale.createdAt', 'DESC')
      .getMany();
    return sales.map(formatSaleResponse);
  }

  async updateStatusSale(
    id: string,
    status: StatusSale,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Sale)
      : this.saleRepository;
    const sale = await repository.update({ id: id }, { status: status });
    if (sale.affected === 0)
      throw new NotFoundException(
        `La venta con ID ${id} no se encuentra registrada`,
      );
  }

  async findOneByIdFinancing(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { financing: { id } },
      relations: ['lot'],
    });
    if (!sale)
      throw new NotFoundException(
        `La venta no tiene un financiamiento con ID ${id}`,
      );
    return sale;
  }

  async findOneSaleWithPayments(id: string): Promise<Sale> {
    return await this.saleRepository.findOne({
      where: { id },
      relations: [
        'client',
        'lot',
        'lot.block',
        'lot.block.stage',
        'lot.block.stage.project',
      ],
    });
  }

  async isValidSaleForWithdrawal(saleId: string) {
    const sale = await this.findOneById(saleId);
    if (!sale)
      throw new NotFoundException(
        `La venta con ID ${saleId} no se encuentra registrada`,
      );
    if (sale.status == StatusSale.COMPLETED)
      throw new BadRequestException(
        `La venta con ID ${saleId} no se puede desistir porque ya fue completada`,
      );
    if (sale.status == StatusSale.REJECTED)
      throw new BadRequestException(
        `La venta con ID ${saleId} no se puede desistir porque ya fue cancelada`,
      );
  }

  async assignParticipantsToSale(
    saleId: string,
    assignParticipantsDto: AssignParticipantsToSaleDto,
  ): Promise<SaleWithCombinedInstallmentsResponse> {
    try {
      // Mapeo de campos DTO a validaciones de tipo
      const participantValidations = [
        {
          id: assignParticipantsDto.linerId,
          type: ParticipantType.LINER,
          field: 'liner',
        },
        {
          id: assignParticipantsDto.telemarketingSupervisorId,
          type: ParticipantType.TELEMARKETING_SUPERVISOR,
          field: 'telemarketingSupervisor',
        },
        {
          id: assignParticipantsDto.telemarketingConfirmerId,
          type: ParticipantType.TELEMARKETING_CONFIRMER,
          field: 'telemarketingConfirmer',
        },
        {
          id: assignParticipantsDto.telemarketerId,
          type: ParticipantType.TELEMARKETER,
          field: 'telemarketer',
        },
        {
          id: assignParticipantsDto.fieldManagerId,
          type: ParticipantType.FIELD_MANAGER,
          field: 'fieldManager',
        },
        {
          id: assignParticipantsDto.fieldSupervisorId,
          type: ParticipantType.FIELD_SUPERVISOR,
          field: 'fieldSupervisor',
        },
        {
          id: assignParticipantsDto.fieldSellerId,
          type: ParticipantType.FIELD_SELLER,
          field: 'fieldSeller',
        },
        {
          id: assignParticipantsDto.salesGeneralManagerId,
          type: ParticipantType.SALES_GENERAL_MANAGER,
          field: 'salesGeneralManager',
        },
        {
          id: assignParticipantsDto.salesManagerId,
          type: ParticipantType.SALES_MANAGER,
          field: 'salesManager',
        },
        {
          id: assignParticipantsDto.postSaleId,
          type: ParticipantType.POST_SALE,
          field: 'postSale',
        },
        {
          id: assignParticipantsDto.closerId,
          type: ParticipantType.CLOSER,
          field: 'closer',
        },
      ];

      // Validar participantes que se están asignando
      await Promise.all(
        participantValidations
          .filter(({ id }) => id !== undefined && id !== null)
          .map(({ id, type }) =>
            this.participantsService.validateParticipantByType(id, type),
          ),
      );

      // Preparar datos para preload
      const updateData: any = { id: saleId };

      participantValidations.forEach(({ id, field }) => {
        if (id !== undefined) {
          updateData[field] = id ? { id } : null;
        }
      });

      // Usar preload para actualizar
      const saleToUpdate = await this.saleRepository.preload(updateData);

      if (!saleToUpdate)
        throw new NotFoundException(
          `La venta con ID ${saleId} no se encuentra registrada`,
        );

      await this.saleRepository.save(saleToUpdate);
      return await this.findOneById(saleId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error al asignar participantes a la venta: ${error.message}`,
      );
    }
  }

  async findAllLeadsByDay(
    findAllLeadsByDayDto: FindAllLeadsByDayDto,
  ): Promise<Paginated<LeadWithParticipantsResponse>> {
    const { day, page = 1, limit = 10, order = 'DESC' } = findAllLeadsByDayDto;
    const paginationDto = { page, limit, order };
    const leads = await this.leadService.findAllByDay(
      day ? new Date(day) : new Date(),
    );
    return PaginationHelper.createPaginatedResponse(
      leads,
      leads.length,
      paginationDto,
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

  async findAllStagesByProjectId(projectId: string): Promise<StageResponse[]> {
    return await this.stageService.findAllByProjectId(projectId);
  }

  async findAllBlocksByStageId(stageId: string): Promise<BlockResponse[]> {
    return await this.blockService.findAllByStageId(stageId);
  }

  async findAllLotsByBlockId(
    blockId: string,
    findAllLotsDto: FindAllLotsDto,
  ): Promise<LotResponse[]> {
    const lots = await this.lotService.findAllByBlockId(blockId);
    return lots.map(formatLotResponse);
  }

  async findAllLotsByProjectId(
    projectId: string,
    findAllLotsDto: FindAllLotsDto,
  ): Promise<Paginated<LotDetailResponseDto>> {
    return await this.lotService.findLotsByProjectId(projectId, findAllLotsDto);
  }

  async findAllLeadsByUser(
    userId: string,
  ): Promise<LeadWithParticipantsResponse[]> {
    const leads = await this.leadService.findAllByUser(userId);
    return leads.map((lead) => {
      const { vendor, ...rest } = lead;
      return rest;
    });
  }

  async findOneGuarantorById(id: number): Promise<Guarantor> {
    return await this.guarantorService.findOneById(id);
  }

  async findOneClientById(id: number): Promise<Client> {
    return await this.clientService.findOneById(id);
  }

  async findOneClientByDocument(document: string): Promise<ClientSaleResponse> {
    return await this.clientService.findOneByDocument(document);
  }

  async createClientAndGuarantor(data: {
    createClient: CreateClientDto;
    createGuarantor?: CreateGuarantorDto;
    createSecondaryClient?: CreateSecondaryClientDto[];
    userId: string;
  }): Promise<ClientAndGuarantorResponse> {
    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        const {
          createClient,
          createGuarantor,
          createSecondaryClient = [],
          userId,
        } = data;
        const client = await this.clientService.createOrUpdate(
          createClient,
          userId,
          queryRunner,
        );
        const guarantor = createGuarantor
          ? await this.guarantorService.createOrUpdate(
              createGuarantor,
              queryRunner,
            )
          : null;
        let secondaryClientIds: number[] = [];

        if (createSecondaryClient && createSecondaryClient.length > 0) {
          const createdSecondaryClients = await Promise.all(
            createSecondaryClient.map(async (dto) => {
              const secondaryClient =
                await this.secondaryClientService.createOrUpdate(
                  dto,
                  userId,
                  queryRunner,
                );
              return secondaryClient.id;
            }),
          );
          secondaryClientIds = createdSecondaryClients;
        }
        return formatClientAndGuarantorResponse(
          client,
          guarantor,
          secondaryClientIds,
        );
      },
    );
  }

  calculateAmortization(
    calculateAmortizationDto: CalculateAmortizationDto,
  ): CombinedAmortizationResponse {
    // Usar el nuevo método combinado que incluye lote + HU
    return this.financingService.generateCombinedAmortizationTable(
      calculateAmortizationDto.totalAmount,
      calculateAmortizationDto.initialAmount,
      calculateAmortizationDto.reservationAmount,
      calculateAmortizationDto.interestRate,
      calculateAmortizationDto.numberOfPayments,
      calculateAmortizationDto.firstPaymentDate,
      calculateAmortizationDto.includeDecimals ?? true,
      calculateAmortizationDto.totalAmountHu,
      calculateAmortizationDto.numberOfPaymentsHu,
      calculateAmortizationDto.firstPaymentDateHu,
    );
  }

  async createPaymentSale(
    saleId: string,
    createPaymentSaleDto: CreatePaymentSaleDto,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<PaymentResponse> {
    const { payments } = createPaymentSaleDto;
    try {
      const sale = await this.findOneById(saleId);
      if (!sale)
        throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);
      const paymentDto = await this.isValidDataPaymentSale(sale, payments);
      return await this.transactionService.runInTransaction(
        async (queryRunner) => {
          const paymentResult = await this.paymentsService.create(
            paymentDto,
            files,
            userId,
            queryRunner,
          );
          return paymentResult;
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al crear pago para venta: ${error.message}`,
      );
    }
  }

  private isValidUrbanDevelopmentDataSale(
    datePayment: string,
    initialAmount: number,
    quantityHuCuotes: number,
  ): void {
    if (!datePayment)
      throw new BadRequestException(
        'La fecha de pago inicial de la habilitación urbana es requerida',
      );
    // El inicial de HU siempre es 0, no se valida
    if (!quantityHuCuotes)
      throw new BadRequestException(
        'El número de cuotas de la habilitación urbana es requerida',
      );
  }

  private async validateReservationData(
    reservationAmount: number,
    maximumHoldPeriod: number,
  ) {
    if (!reservationAmount || reservationAmount <= 0)
      throw new BadRequestException(
        'El monto de reserva es requerido y debe ser mayor a cero',
      );
    if (!maximumHoldPeriod || maximumHoldPeriod <= 0)
      throw new BadRequestException(
        'El periodo de reserva es requerido y debe ser mayor a cero',
      );
  }

  private calculateAndCreateFinancingHu(
    saleDto: CreateSaleDto | UpdateSaleDto,
  ) {
    // Las cuotas de HU ahora vienen desde el frontend, no se calculan aquí
    return {
      financingType: FinancingType.CREDITO,
      initialAmount: saleDto.initialAmountUrbanDevelopment || 0,
      interestRate: 0,
      quantityCoutes: saleDto.quantityHuCuotes,
      initialPaymentDate: saleDto.firstPaymentDateHu,
      financingInstallments: saleDto.financingInstallmentsHu || [],
    };
  }

  private async createUrbanDevelopment(
    savedSaleId: string,
    financingHuId: string,
    saleDto: CreateSaleDto | UpdateSaleDto,
    queryRunner: QueryRunner,
  ) {
    await this.urbanDevelopmentService.create(
      {
        saleId: savedSaleId,
        financingId: financingHuId,
        amount: saleDto.totalAmountUrbanDevelopment,
        initialAmount: saleDto.initialAmountUrbanDevelopment,
      },
      queryRunner,
    );
  }

  private isValidFinancingDataSale(
    totalAmount: number,
    reservationAmount: number,
    initialAmount: number,
    interestRate: number,
    quantitySaleCoutes: number,
    financingInstallments: CreateFinancingInstallmentsDto[],
    totalAmountHu?: number,
    quantityHuCoutes?: number,
    financingInstallmentsHu?: CreateFinancingInstallmentsDto[],
    firstPaymentDateHu?: string,
  ): void {
    // Validaciones básicas del lote
    if (!interestRate)
      throw new BadRequestException('El porcentaje de interés es requerido');
    if (!quantitySaleCoutes)
      throw new BadRequestException('La cantidad de cuotas es requerido');
    if (!financingInstallments)
      throw new BadRequestException('Las cuotas de financiación es requerida');
    if (financingInstallments.length !== quantitySaleCoutes)
      throw new BadRequestException(
        `El número de cuotas enviadas (${financingInstallments.length}) no coincide con la cantidad de cuotas esperada (${quantitySaleCoutes}).`,
      );

    // Validar cuotas del lote
    const sumOfInstallmentAmounts = financingInstallments.reduce(
      (sum, installment) => sum + installment.couteAmount,
      0,
    );

    console.log('=== VALIDACIÓN CUOTAS LOTE ===');
    console.log('totalAmount (debe ser SOLO del lote):', totalAmount);
    console.log('initialAmount:', initialAmount);
    console.log('reservationAmount:', reservationAmount);
    console.log(
      'Principal a financiar (totalAmount - initial - reservation):',
      totalAmount - initialAmount - reservationAmount,
    );
    console.log('Suma de cuotas enviadas:', sumOfInstallmentAmounts);

    const calculatedAmortization =
      this.financingService.generateAmortizationTable(
        totalAmount,
        initialAmount,
        reservationAmount,
        interestRate,
        quantitySaleCoutes,
        financingInstallments[0]?.expectedPaymentDate.toString(),
        true,
      );

    const expectedTotalAmortizedAmount = calculatedAmortization.reduce(
      (sum, inst) => sum + inst.couteAmount,
      0,
    );

    console.log('Suma esperada según cálculo:', expectedTotalAmortizedAmount);
    console.log(
      'Diferencia:',
      Math.abs(sumOfInstallmentAmounts - expectedTotalAmortizedAmount),
    );

    if (Math.abs(sumOfInstallmentAmounts - expectedTotalAmortizedAmount) > 1.0)
      throw new BadRequestException(
        `[LOTE] La suma de los montos de las cuotas del lote enviadas (${sumOfInstallmentAmounts.toFixed(2)}) no coincide con el monto total esperado según la amortización (${expectedTotalAmortizedAmount.toFixed(2)}). Diferencia: ${Math.abs(sumOfInstallmentAmounts - expectedTotalAmortizedAmount).toFixed(2)}. Verifica que totalAmount sea SOLO del lote (sin incluir HU).`,
      );

    // Validar cuotas de HU si existen
    if (totalAmountHu && totalAmountHu > 0) {
      if (!quantityHuCoutes)
        throw new BadRequestException(
          'La cantidad de cuotas de HU es requerida',
        );
      if (!financingInstallmentsHu || financingInstallmentsHu.length === 0)
        throw new BadRequestException('Las cuotas de HU son requeridas');
      if (financingInstallmentsHu.length !== quantityHuCoutes)
        throw new BadRequestException(
          `El número de cuotas de HU enviadas (${financingInstallmentsHu.length}) no coincide con la cantidad de cuotas esperada (${quantityHuCoutes}).`,
        );

      // Validar suma de cuotas de HU
      const sumOfHuInstallmentAmounts = financingInstallmentsHu.reduce(
        (sum, installment) => sum + installment.couteAmount,
        0,
      );

      // Generar amortización de HU (sin inicial, sin interés)
      const calculatedHuAmortization =
        this.financingService.generateAmortizationTable(
          totalAmountHu,
          0, // Sin inicial
          0, // Sin reserva
          0, // Sin interés
          quantityHuCoutes,
          firstPaymentDateHu ||
            financingInstallmentsHu[0]?.expectedPaymentDate.toString(),
          true,
        );

      const expectedTotalHuAmount = calculatedHuAmortization.reduce(
        (sum, inst) => sum + inst.couteAmount,
        0,
      );

      if (Math.abs(sumOfHuInstallmentAmounts - expectedTotalHuAmount) > 1.0)
        throw new BadRequestException(
          `[HU] La suma de los montos de las cuotas de HU enviadas (${sumOfHuInstallmentAmounts.toFixed(2)}) no coincide con el monto total esperado según la amortización (${expectedTotalHuAmount.toFixed(2)}). Diferencia: ${Math.abs(sumOfHuInstallmentAmounts - expectedTotalHuAmount).toFixed(2)}.`,
        );
    }
  }

  async updateReservationPeriod(
    saleId: string,
    additionalDays: number,
  ): Promise<UpdateReservationPeriodResponseDto> {
    try {
      // Buscar la venta
      const sale = await this.saleRepository.findOne({
        where: { id: saleId },
      });

      if (!sale)
        throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);

      // Validar que esté en estado RESERVATION_PENDING
      if (sale.status !== StatusSale.RESERVATION_PENDING)
        throw new BadRequestException(
          `Solo se puede actualizar el período de reservas en estado RESERVATION_PENDING. Estado actual: ${sale.status}`,
        );

      // Validar que tenga un período máximo configurado
      if (!sale.maximumHoldPeriod)
        throw new BadRequestException(
          'Esta venta no tiene un período máximo de reserva configurado',
        );
      // Calcular nuevo período
      const previousPeriod = sale.maximumHoldPeriod;
      const newPeriod = previousPeriod + additionalDays;

      // Calcular nueva fecha de expiración
      const createdAt = new Date(sale.createdAt);
      const newExpirationDate = new Date(
        createdAt.getTime() + newPeriod * 24 * 60 * 60 * 1000,
      );

      // Actualizar en base de datos
      await this.saleRepository.update(saleId, {
        maximumHoldPeriod: newPeriod,
      });

      return {
        saleId,
        previousPeriod,
        newPeriod,
        newExpirationDate: newExpirationDate.toISOString().split('T')[0], // Solo la fecha
        message: `Período extendido ${additionalDays} días. Nuevo total: ${newPeriod} días.`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Error al actualizar el período de reserva',
      );
    }
  }

  async processExpiredReservations(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    totalPoints: number;
  }> {
    const logger = new Logger('SalesService - processExpiredReservations');
    logger.log('Iniciando procesamiento de reservas expiradas');
    let processed = 0;
    let successful = 0;
    let failed = 0;
    try {
      const currentDate = new Date();

      // Buscar todas las ventas en estado RESERVATION_PENDING
      const pendingReservations = await this.saleRepository
        .createQueryBuilder('sale')
        .where('sale.status = :status', {
          status: StatusSale.RESERVATION_PENDING,
        })
        .andWhere('sale.maximumHoldPeriod IS NOT NULL')
        .andWhere('sale.createdAt IS NOT NULL')
        .getMany();

      logger.log(
        `Encontradas ${pendingReservations.length} reservas pendientes para evaluar`,
      );

      for (const sale of pendingReservations) {
        processed++;

        try {
          // Calcular la fecha límite para la reserva
          const createdAt = new Date(sale.createdAt);
          const expirationDate = new Date(
            createdAt.getTime() + sale.maximumHoldPeriod * 24 * 60 * 60 * 1000,
          );

          // Verificar si la reserva ha expirado
          if (currentDate > expirationDate) {
            // Actualizar el estado de la venta a REJECTED y agregar el motivo
            await this.saleRepository.update(sale.id, {
              status: StatusSale.REJECTED,
              cancellationReason: `Reserva expirada automáticamente. Período máximo de retención: ${sale.maximumHoldPeriod} días. Fecha de expiración: ${expirationDate.toISOString().split('T')[0]}`,
            });

            logger.log(
              `Venta ${sale.id} marcada como REJECTED por expiración de reserva`,
            );
            successful++;
          }
        } catch (error) {
          logger.error(
            `Error procesando venta ${sale.id}: ${error.message}`,
            error.stack,
          );
          failed++;
        }
      }

      const result = {
        processed,
        successful,
        failed,
        totalPoints: pendingReservations.length,
      };

      logger.log(
        `Procesamiento completado: ${successful}/${processed} reservas procesadas exitosamente`,
      );
      return result;
    } catch (error) {
      logger.error(
        `Error general en processExpiredReservations: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateSale(
    id: string,
    updateSaleDto: UpdateSaleDto,
    userId: string,
  ): Promise<SaleWithCombinedInstallmentsResponse> {
    try {
      // Separar el array combinado en dos arrays: lote y HU
      if (
        updateSaleDto.combinedInstallments &&
        updateSaleDto.combinedInstallments.length > 0
      ) {
        const lotInstallments: CreateFinancingInstallmentsDto[] = [];
        const huInstallments: CreateFinancingInstallmentsDto[] = [];

        for (const combined of updateSaleDto.combinedInstallments) {
          // Agregar cuota de lote si existe
          if (
            combined.lotInstallmentAmount !== null &&
            combined.lotInstallmentAmount !== undefined
          ) {
            lotInstallments.push({
              couteAmount: combined.lotInstallmentAmount,
              expectedPaymentDate: combined.expectedPaymentDate,
            });
          }

          // Agregar cuota de HU si existe
          if (
            combined.huInstallmentAmount !== null &&
            combined.huInstallmentAmount !== undefined
          ) {
            huInstallments.push({
              couteAmount: combined.huInstallmentAmount,
              expectedPaymentDate: combined.expectedPaymentDate,
            });
          }
        }

        // Asignar los arrays separados al DTO
        updateSaleDto.financingInstallments = lotInstallments;
        updateSaleDto.financingInstallmentsHu =
          huInstallments.length > 0 ? huInstallments : undefined;
      }

      // Buscar la venta existente con todas sus relaciones
      const existingSale = await this.saleRepository.findOne({
        where: { id },
        relations: [
          'financing',
          'financing.financingInstallments',
          'urbanDevelopment',
          'urbanDevelopment.financing',
          'urbanDevelopment.financing.financingInstallments',
          'lot',
          'client',
          'secondaryClientSales',
        ],
      });
      if (!existingSale)
        throw new NotFoundException(
          `La venta con ID ${id} no se encuentra registrada`,
        );
      // Validar que el estado permita edición
      if (
        existingSale.status !== StatusSale.PENDING &&
        existingSale.status !== StatusSale.RESERVATION_PENDING
      )
        throw new BadRequestException(
          `Solo se pueden editar ventas en estado PENDING o RESERVATION_PENDING. Estado actual: ${existingSale.status}`,
        );
      // Validar fechas si se proporcionan
      if (updateSaleDto.firstPaymentDateHu)
        validateSaleDates({
          firstPaymentDateHu: updateSaleDto.firstPaymentDateHu,
        });
      // Validar lote si ha cambiado
      if (updateSaleDto.lotId && updateSaleDto.lotId !== existingSale.lot.id)
        await this.lotService.isLotValidForSale(updateSaleDto.lotId);
      // Validar datos de reserva si se proporcionan
      if (
        updateSaleDto.isReservation !== undefined &&
        updateSaleDto.isReservation
      )
        await this.validateReservationData(
          updateSaleDto.reservationAmount,
          updateSaleDto.maximumHoldPeriod,
        );
      // Validar cliente si ha cambiado
      if (
        updateSaleDto.clientId &&
        updateSaleDto.clientId !== existingSale.client.id
      )
        await this.clientService.isValidClient(updateSaleDto.clientId);
      // Validar garante si se proporciona
      if (updateSaleDto.guarantorId)
        await this.guarantorService.isValidGuarantor(updateSaleDto.guarantorId);
      // Validar clientes secundarios si se proporcionan
      if (
        updateSaleDto.secondaryClientsIds &&
        updateSaleDto.secondaryClientsIds.length > 0
      )
        await Promise.all(
          updateSaleDto.secondaryClientsIds.map((id) =>
            this.secondaryClientService.isValidSecondaryClient(id),
          ),
        );
      // Ejecutar actualización en una transacción
      await this.transactionService.runInTransaction(async (queryRunner) => {
        const saleRepository = queryRunner.manager.getRepository(Sale);
        // Determinar el nuevo estado según los cambios
        let newStatus = existingSale.status;
        const wasReservation = existingSale.fromReservation;
        const willBeReservation =
          updateSaleDto.isReservation !== undefined
            ? updateSaleDto.isReservation
            : wasReservation;
        // Si cambia de venta a reserva
        if (
          !wasReservation &&
          willBeReservation &&
          existingSale.status === StatusSale.PENDING
        )
          newStatus = StatusSale.RESERVATION_PENDING;
        // Manejar cambio de tipo de venta (DIRECT_PAYMENT <-> FINANCED)
        const oldType = existingSale.type;
        const newType = updateSaleDto.saleType || oldType;
        let financingId = existingSale.financing?.id || null;
        // Si cambia de DIRECT_PAYMENT a FINANCED
        if (
          oldType === SaleType.DIRECT_PAYMENT &&
          newType === SaleType.FINANCED
        ) {
          // Validar datos de financiamiento
          this.isValidFinancingDataSale(
            updateSaleDto.totalAmount || existingSale.totalAmount,
            updateSaleDto.reservationAmount ||
              existingSale.reservationAmount ||
              0,
            updateSaleDto.initialAmount,
            updateSaleDto.interestRate,
            updateSaleDto.quantitySaleCoutes,
            updateSaleDto.financingInstallments,
            updateSaleDto.totalAmountUrbanDevelopment ||
              existingSale.urbanDevelopment?.amount,
            updateSaleDto.quantityHuCuotes,
            updateSaleDto.financingInstallmentsHu,
            updateSaleDto.firstPaymentDateHu,
          );
          // Crear nuevo financiamiento
          const financingData = {
            financingType: FinancingType.CREDITO,
            initialAmount: updateSaleDto.initialAmount,
            interestRate: updateSaleDto.interestRate,
            quantityCoutes: updateSaleDto.quantitySaleCoutes,
            financingInstallments: updateSaleDto.financingInstallments,
          };
          const newFinancing = await this.financingService.create(
            financingData,
            queryRunner,
          );
          financingId = newFinancing.id;
        }
        // Si cambia de FINANCED a DIRECT_PAYMENT
        if (
          oldType === SaleType.FINANCED &&
          newType === SaleType.DIRECT_PAYMENT
        ) {
          // Eliminar financiamiento existente si existe
          if (existingSale.financing) {
            await this.financingService.remove(
              existingSale.financing.id,
              queryRunner,
            );
            financingId = null;
          }
        }
        // Si sigue siendo FINANCED y se actualizan datos de financiamiento
        if (
          oldType === SaleType.FINANCED &&
          newType === SaleType.FINANCED &&
          (updateSaleDto.initialAmount !== undefined ||
            updateSaleDto.interestRate !== undefined ||
            updateSaleDto.quantitySaleCoutes !== undefined ||
            updateSaleDto.financingInstallments !== undefined)
        ) {
          // Validar datos de financiamiento
          this.isValidFinancingDataSale(
            updateSaleDto.totalAmount || existingSale.totalAmount,
            updateSaleDto.reservationAmount ||
              existingSale.reservationAmount ||
              0,
            updateSaleDto.initialAmount,
            updateSaleDto.interestRate,
            updateSaleDto.quantitySaleCoutes,
            updateSaleDto.financingInstallments,
            updateSaleDto.totalAmountUrbanDevelopment ||
              existingSale.urbanDevelopment?.amount,
            updateSaleDto.quantityHuCuotes,
            updateSaleDto.financingInstallmentsHu,
            updateSaleDto.firstPaymentDateHu,
          );
          if (existingSale.financing) {
            // Actualizar financiamiento existente
            await this.financingService.update(
              existingSale.financing.id,
              {
                initialAmount: updateSaleDto.initialAmount,
                interestRate: updateSaleDto.interestRate,
                quantityCoutes: updateSaleDto.quantitySaleCoutes,
                financingInstallments: updateSaleDto.financingInstallments,
              },
              queryRunner,
            );
          } else {
            // Crear nuevo financiamiento si no existe
            const financingData = {
              financingType: FinancingType.CREDITO,
              initialAmount: updateSaleDto.initialAmount,
              interestRate: updateSaleDto.interestRate,
              quantityCoutes: updateSaleDto.quantitySaleCoutes,
              financingInstallments: updateSaleDto.financingInstallments,
            };
            const newFinancing = await this.financingService.create(
              financingData,
              queryRunner,
            );
            financingId = newFinancing.id;
          }
        }
        // Actualizar la venta principal
        await saleRepository.update(id, {
          lot: updateSaleDto.lotId
            ? { id: updateSaleDto.lotId }
            : existingSale.lot,
          client: updateSaleDto.clientId
            ? { id: updateSaleDto.clientId }
            : existingSale.client,
          guarantor:
            updateSaleDto.guarantorId !== undefined
              ? updateSaleDto.guarantorId
                ? { id: updateSaleDto.guarantorId }
                : null
              : existingSale.guarantor,
          type: newType,
          totalAmount: updateSaleDto.totalAmount || existingSale.totalAmount,
          contractDate: updateSaleDto.contractDate || existingSale.contractDate,
          financing: financingId ? { id: financingId } : null,
          metadata:
            updateSaleDto.metadata !== undefined
              ? updateSaleDto.metadata
              : existingSale.metadata,
          notes:
            updateSaleDto.notes !== undefined
              ? updateSaleDto.notes
              : existingSale.notes,
          applyLateFee:
            updateSaleDto.applyLateFee !== undefined
              ? updateSaleDto.applyLateFee
              : existingSale.applyLateFee,
          fromReservation: willBeReservation,
          reservationAmount:
            updateSaleDto.reservationAmount !== undefined
              ? updateSaleDto.reservationAmount
              : existingSale.reservationAmount,
          maximumHoldPeriod:
            updateSaleDto.maximumHoldPeriod !== undefined
              ? updateSaleDto.maximumHoldPeriod
              : existingSale.maximumHoldPeriod,
          status: newStatus,
        });
        // Manejar clientes secundarios
        if (updateSaleDto.secondaryClientsIds !== undefined) {
          // Eliminar clientes secundarios existentes
          for (const secondaryClientSale of existingSale.secondaryClientSales) {
            await this.secondaryClientService.removeSecondaryClientSale(
              secondaryClientSale.id,
              queryRunner,
            );
          }
          // Agregar nuevos clientes secundarios
          if (updateSaleDto.secondaryClientsIds.length > 0)
            await Promise.all(
              updateSaleDto.secondaryClientsIds.map(
                async (secondaryClientId) => {
                  return await this.secondaryClientService.createSecondaryClientSale(
                    id,
                    secondaryClientId,
                    queryRunner,
                  );
                },
              ),
            );
        }
        // Manejar habilitación urbana
        if (updateSaleDto.totalAmountUrbanDevelopment !== undefined) {
          if (updateSaleDto.totalAmountUrbanDevelopment === 0) {
            // Eliminar habilitación urbana si existe
            if (existingSale.urbanDevelopment)
              await this.urbanDevelopmentService.remove(
                existingSale.urbanDevelopment.id,
                queryRunner,
              );
          } else {
            // Validar datos de habilitación urbana
            this.isValidUrbanDevelopmentDataSale(
              updateSaleDto.firstPaymentDateHu,
              updateSaleDto.initialAmountUrbanDevelopment,
              updateSaleDto.quantityHuCuotes,
            );
            const financingDataHu =
              this.calculateAndCreateFinancingHu(updateSaleDto);
            if (existingSale.urbanDevelopment) {
              // Actualizar habilitación urbana existente
              await this.financingService.update(
                existingSale.urbanDevelopment.financing.id,
                financingDataHu,
                queryRunner,
              );
            } else {
              // Crear nueva habilitación urbana
              const financingHu = await this.financingService.create(
                financingDataHu,
                queryRunner,
              );
              await this.createUrbanDevelopment(
                id,
                financingHu.id,
                updateSaleDto,
                queryRunner,
              );
            }
          }
        }
        // Actualizar estado del lote si cambió
        if (
          updateSaleDto.lotId &&
          updateSaleDto.lotId !== existingSale.lot.id
        ) {
          // Liberar lote anterior
          await this.lotService.updateStatus(
            existingSale.lot.id,
            LotStatus.ACTIVE,
            queryRunner,
          );
          // Marcar nuevo lote
          const lotStatus = willBeReservation
            ? LotStatus.RESERVED
            : LotStatus.SOLD;
          await this.lotService.updateStatus(
            updateSaleDto.lotId,
            lotStatus,
            queryRunner,
          );
        }
      });

      // Retornar la venta actualizada DESPUÉS de que la transacción se complete
      return await this.findOneById(id);
    } catch (error) {
      throw error;
    }
  }

  async deleteSale(saleId: string): Promise<{ message: string }> {
    try {
      // Buscar la venta con sus relaciones
      const sale = await this.saleRepository.findOne({
        where: { id: saleId },
        relations: ['lot', 'financing'],
      });

      if (!sale)
        throw new NotFoundException(`La venta con ID ${saleId} no existe`);

      // Eliminar la venta y todas sus relaciones en una transacción
      await this.transactionService.runInTransaction(
        async (queryRunner: QueryRunner) => {
          // Eliminar pagos relacionados a la venta
          await queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from('payments')
            .where('relatedEntityId = :saleId', { saleId })
            .andWhere('relatedEntityType = :type', { type: 'Sale' })
            .execute();

          // Eliminar pagos relacionados al financiamiento si existe
          if (sale.financing) {
            await queryRunner.manager
              .createQueryBuilder()
              .delete()
              .from('payments')
              .where('relatedEntityId = :financingId', {
                financingId: sale.financing.id,
              })
              .andWhere('relatedEntityType = :type', { type: 'Financing' })
              .execute();
          }

          // Liberar el lote (cambiar estado a ACTIVE)
          if (sale.lot) {
            await this.lotService.updateStatus(
              sale.lot.id,
              LotStatus.ACTIVE,
              queryRunner,
            );
          }

          // Eliminar la venta
          // Las cascadas en DB se encargan de: financing, urbanDevelopment, secondaryClientSales, financingInstallments
          const saleRepository = queryRunner.manager.getRepository(Sale);
          await saleRepository.remove(sale);
        },
      );

      return {
        message: `La venta con ID ${saleId} ha sido eliminada exitosamente`,
      };
    } catch (error) {
      throw error;
    }
  }

  private async findOneByIdForExport(id: string): Promise<Sale> {
    // Usar QueryBuilder para optimizar la carga con un solo query
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('financing.financingInstallments', 'installments')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale) {
      throw new NotFoundException(
        `La venta con ID ${id} no se encuentra registrada`,
      );
    }

    return sale;
  }

  private async findAllPaymentsForSale(
    saleId: string,
    financingId: string | null,
  ): Promise<Payment[]> {
    // Usar QueryBuilder para optimizar la consulta con OR
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.details', 'details')
      .where(
        '(payment.relatedEntityType = :reservationType AND payment.relatedEntityId = :saleId)',
        { reservationType: 'reservation', saleId },
      );

    if (financingId) {
      query
        .orWhere(
          '(payment.relatedEntityType = :financingType AND payment.relatedEntityId = :financingId)',
          { financingType: 'financing', financingId },
        )
        .orWhere(
          '(payment.relatedEntityType = :installmentsType AND payment.relatedEntityId = :financingId)',
          { installmentsType: 'financingInstallments', financingId },
        );
    }

    return query.orderBy('payment.createdAt', 'ASC').getMany();
  }

  async exportSaleToExcel(id: string): Promise<Buffer> {
    try {
      const startTime = Date.now();

      // Primero obtener la venta para tener el financingId
      const sale = await this.findOneByIdForExport(id);
      this.logger.log(`✅ Sale loaded in ${Date.now() - startTime}ms`);

      const paymentsStart = Date.now();
      // Obtener pagos (ahora optimizado con QueryBuilder)
      const payments = await this.findAllPaymentsForSale(
        sale.id,
        sale.financing?.id || null,
      );
      this.logger.log(
        `✅ Payments loaded in ${Date.now() - paymentsStart}ms (${payments.length} payments)`,
      );

      const transformStart = Date.now();
      const rows = transformSaleToExcelRows(sale, payments);
      this.logger.log(
        `✅ Rows transformed in ${Date.now() - transformStart}ms (${rows.length} rows)`,
      );

      const excelStart = Date.now();
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Venta');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      this.logger.log(`✅ Excel generated in ${Date.now() - excelStart}ms`);

      this.logger.log(`🎉 Total export time: ${Date.now() - startTime}ms`);
      return buffer;
    } catch (error) {
      throw new InternalServerErrorException(
        `Error al exportar la venta a Excel: ${error.message}`,
      );
    }
  }

  // ============================================================
  // EXPORTACIÓN SMART - CON MÚLTIPLES TABS Y TODA LA INFORMACIÓN
  // ============================================================

  private async findOneByIdForExportSmart(id: string): Promise<Sale> {
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      // Cliente y Lead con todas sus relaciones
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('lead.source', 'leadSource')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('client.collector', 'collector')
      // Lote y ubicación
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      // Financiamiento y cuotas
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('financing.financingInstallments', 'installments')
      // Clientes secundarios
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      // Garante
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      // Vendedor
      .leftJoinAndSelect('sale.vendor', 'vendor')
      // Lead Visit con todos sus participantes
      .leftJoinAndSelect('sale.leadVisit', 'leadVisit')
      .leftJoinAndSelect('leadVisit.linerParticipant', 'visitLiner')
      .leftJoinAndSelect(
        'leadVisit.telemarketingSupervisor',
        'visitTmkSupervisor',
      )
      .leftJoinAndSelect(
        'leadVisit.telemarketingConfirmer',
        'visitTmkConfirmer',
      )
      .leftJoinAndSelect('leadVisit.telemarketer', 'visitTelemarketer')
      .leftJoinAndSelect('leadVisit.fieldManager', 'visitFieldManager')
      .leftJoinAndSelect('leadVisit.fieldSupervisor', 'visitFieldSupervisor')
      .leftJoinAndSelect('leadVisit.fieldSeller', 'visitFieldSeller')
      .leftJoinAndSelect('leadVisit.salesManager', 'visitSalesManager')
      .leftJoinAndSelect(
        'leadVisit.salesGeneralManager',
        'visitSalesGeneralManager',
      )
      .leftJoinAndSelect('leadVisit.postSale', 'visitPostSale')
      .leftJoinAndSelect('leadVisit.closer', 'visitCloser')
      // Participantes de la venta
      .leftJoinAndSelect('sale.liner', 'saleLiner')
      .leftJoinAndSelect('sale.telemarketingSupervisor', 'saleTmkSupervisor')
      .leftJoinAndSelect('sale.telemarketingConfirmer', 'saleTmkConfirmer')
      .leftJoinAndSelect('sale.telemarketer', 'saleTelemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'saleFieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'saleFieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'saleFieldSeller')
      .leftJoinAndSelect('sale.salesManager', 'saleSalesManager')
      .leftJoinAndSelect('sale.salesGeneralManager', 'saleSalesGeneralManager')
      .leftJoinAndSelect('sale.postSale', 'salePostSale')
      .leftJoinAndSelect('sale.closer', 'saleCloser')
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale) {
      throw new NotFoundException(
        `La venta con ID ${id} no se encuentra registrada`,
      );
    }

    return sale;
  }

  async exportSaleToExcelSmart(id: string): Promise<Buffer> {
    try {
      const startTime = Date.now();

      // Obtener la venta con TODAS las relaciones necesarias
      const sale = await this.findOneByIdForExportSmart(id);
      this.logger.log(
        `✅ [Smart Export] Sale loaded in ${Date.now() - startTime}ms`,
      );

      const paymentsStart = Date.now();
      // Obtener pagos con detalles
      const payments = await this.findAllPaymentsForSale(
        sale.id,
        sale.financing?.id || null,
      );
      this.logger.log(
        `✅ [Smart Export] Payments loaded in ${Date.now() - paymentsStart}ms (${payments.length} payments)`,
      );

      const excelStart = Date.now();
      // Crear el workbook con múltiples tabs usando ExcelJS
      const workbook = await createSmartExcelWorkbook(sale, payments);
      const arrayBuffer = await workbook.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);
      this.logger.log(
        `✅ [Smart Export] Excel generated in ${Date.now() - excelStart}ms`,
      );

      this.logger.log(
        `🎉 [Smart Export] Total export time: ${Date.now() - startTime}ms`,
      );
      return buffer;
    } catch (error) {
      this.logger.error(
        `❌ [Smart Export] Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Error al exportar la venta a Excel (Smart): ${error.message}`,
      );
    }
  }

  // ============================================================
  // ACTUALIZACIÓN DE CUOTAS DE FINANCIAMIENTO
  // ============================================================

  async updateFinancingInstallments(
    saleId: string,
    financingId: string,
    dto: {
      newTotalAmount?: number;
      installments: Array<{
        id?: string;
        numberCuote: number;
        couteAmount: number;
        expectedPaymentDate: string;
        lateFeeAmount?: number;
      }>;
    },
  ): Promise<{
    message: string;
    financing: any;
    redistributedAmount?: number;
  }> {
    // 1. Validar que la venta existe y obtener datos
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: ['financing', 'financing.financingInstallments'],
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID ${saleId} no existe`);
    }

    if (!sale.financing || sale.financing.id !== financingId) {
      throw new BadRequestException(
        `El financiamiento con ID ${financingId} no corresponde a la venta ${saleId}`,
      );
    }

    // 2. Validar que no hay pagos pendientes de aprobación
    if (
      sale.status === StatusSale.PENDING_APPROVAL ||
      sale.status === StatusSale.RESERVATION_PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        'No se pueden modificar las cuotas porque la venta tiene un pago pendiente de aprobación',
      );
    }

    // 3. Verificar que no hay pagos PENDING en el sistema de pagos
    const pendingPayments = await this.paymentRepository.find({
      where: [
        {
          relatedEntityType: 'financingInstallments',
          relatedEntityId: financingId,
          status: In(['PENDING']),
        },
        {
          relatedEntityType: 'financing',
          relatedEntityId: financingId,
          status: In(['PENDING']),
        },
      ],
    });

    if (pendingPayments.length > 0) {
      throw new BadRequestException(
        'No se pueden modificar las cuotas porque hay pagos pendientes de aprobación',
      );
    }

    // 4. Obtener cuotas existentes
    const existingInstallments = sale.financing.financingInstallments || [];

    // 5. Crear mapa de cuotas existentes
    const existingInstallmentsMap = new Map(
      existingInstallments.map((inst) => [inst.id, inst]),
    );

    // 6. Identificar cuotas que se modifican y se eliminan
    const newInstallmentIds = new Set(
      dto.installments.filter((i) => i.id).map((i) => i.id),
    );

    // Cuotas a eliminar (existentes que no están en el nuevo array)
    const installmentsToDelete = existingInstallments.filter(
      (inst) => !newInstallmentIds.has(inst.id),
    );

    // Validar que solo cuotas PENDING o EXPIRED pueden ser eliminadas (no PAID)
    for (const inst of installmentsToDelete) {
      if (inst.status === StatusFinancingInstallments.PAID) {
        throw new BadRequestException(
          `La cuota #${inst.numberCuote} no puede ser eliminada porque está completamente PAGADA.`,
        );
      }
    }

    // Cuotas que se modifican (las que tienen ID y existen)
    const installmentsToModify = dto.installments.filter((inst) => {
      if (!inst.id) return false;
      const existing = existingInstallmentsMap.get(inst.id);
      return existing && existing.status !== StatusFinancingInstallments.PAID;
    });

    // Validar que cuotas PAID no se pueden modificar
    for (const inst of dto.installments.filter((i) => i.id)) {
      const existing = existingInstallmentsMap.get(inst.id);
      if (existing && existing.status === StatusFinancingInstallments.PAID) {
        throw new BadRequestException(
          `La cuota #${existing.numberCuote} no puede ser modificada porque está completamente PAGADA.`,
        );
      }
    }

    // 7. Calcular el monto total ya pagado (coutePaid) de cuotas que se eliminan
    let amountToRedistribute = 0;
    for (const inst of installmentsToDelete) {
      amountToRedistribute += Number(inst.coutePaid) || 0;
    }

    // 8. Calcular el monto total de las nuevas cuotas
    const totalInstallmentsAmount = dto.installments.reduce(
      (sum, inst) => sum + Number(inst.couteAmount),
      0,
    );

    // 9. Determinar los montos a usar (nuevos o existentes)
    const totalAmount = dto.newTotalAmount ?? sale.totalAmount;
    const initialAmount = sale.financing.initialAmount; // NO editable
    const reservationAmount = sale.reservationAmount || 0;

    // 10. Calcular el monto que debe cubrir el financiamiento
    const amountToFinance = Number(
      (
        Number(totalAmount) -
        Number(initialAmount) -
        Number(reservationAmount)
      ).toFixed(2),
    );

    // 11. Validar que la suma de cuotas coincida con el monto a financiar (con tolerancia de 1.0)
    const difference = Math.abs(totalInstallmentsAmount - amountToFinance);
    if (difference > 1.0) {
      throw new BadRequestException(
        `La suma de las cuotas (${totalInstallmentsAmount.toFixed(2)}) no coincide con el monto a financiar (${amountToFinance.toFixed(2)}). ` +
          `Diferencia: ${difference.toFixed(2)}. ` +
          `Monto total: ${totalAmount}, Inicial: ${initialAmount}, Reserva: ${reservationAmount}`,
      );
    }

    // 12. Ejecutar la actualización en una transacción
    await this.transactionService.runInTransaction(async (queryRunner) => {
      const financingInstallmentsRepo = queryRunner.manager.getRepository(
        FinancingInstallments,
      );
      const financingRepo = queryRunner.manager.getRepository(Financing);
      const saleRepo = queryRunner.manager.getRepository(Sale);

      // 12.1 Eliminar cuotas que ya no están
      for (const inst of installmentsToDelete) {
        await financingInstallmentsRepo.remove(inst);
      }

      // 12.2 Actualizar o crear cuotas (primera pasada - sin redistribución)
      const savedInstallments: FinancingInstallments[] = [];

      for (const inst of dto.installments) {
        if (inst.id) {
          // Actualizar cuota existente
          const existing = existingInstallmentsMap.get(inst.id);
          if (existing) {
            // Guardar el coutePaid anterior si la cuota se modifica
            const previousCoutePaid = Number(existing.coutePaid) || 0;

            // Si el monto de la cuota cambió, ajustar
            if (Number(existing.couteAmount) !== Number(inst.couteAmount)) {
              // Si el nuevo monto es menor que lo ya pagado, ese excedente se redistribuye
              if (previousCoutePaid > Number(inst.couteAmount)) {
                amountToRedistribute +=
                  previousCoutePaid - Number(inst.couteAmount);
                existing.coutePaid = inst.couteAmount;
                existing.coutePending = 0;
              } else {
                // Mantener lo pagado y ajustar el pendiente
                existing.coutePaid = previousCoutePaid;
                existing.coutePending =
                  Number(inst.couteAmount) - previousCoutePaid;
              }
            }

            existing.numberCuote = inst.numberCuote;
            existing.couteAmount = inst.couteAmount;
            existing.expectedPaymentDate = new Date(inst.expectedPaymentDate);

            // Actualizar mora si se proporciona
            if (inst.lateFeeAmount !== undefined) {
              existing.lateFeeAmount = inst.lateFeeAmount;
              existing.lateFeeAmountPending =
                inst.lateFeeAmount - (Number(existing.lateFeeAmountPaid) || 0);
              if (existing.lateFeeAmountPending < 0)
                existing.lateFeeAmountPending = 0;
            }

            // Determinar estado: PAID si coutePaid >= couteAmount, sino PENDING
            existing.status =
              Number(existing.coutePaid) >= Number(existing.couteAmount)
                ? StatusFinancingInstallments.PAID
                : StatusFinancingInstallments.PENDING;

            const saved = await financingInstallmentsRepo.save(existing);
            savedInstallments.push(saved);
          }
        } else {
          // Crear nueva cuota
          const lateFee = inst.lateFeeAmount || 0;
          const newInstallment = financingInstallmentsRepo.create({
            numberCuote: inst.numberCuote,
            couteAmount: inst.couteAmount,
            coutePending: inst.couteAmount,
            coutePaid: 0,
            expectedPaymentDate: new Date(inst.expectedPaymentDate),
            lateFeeAmount: lateFee,
            lateFeeAmountPending: lateFee,
            lateFeeAmountPaid: 0,
            status: StatusFinancingInstallments.PENDING,
            financing: sale.financing,
          });
          const saved = await financingInstallmentsRepo.save(newInstallment);
          savedInstallments.push(saved);
        }
      }

      // 12.3 Redistribuir el monto pagado de cuotas eliminadas a las siguientes cuotas pendientes
      if (amountToRedistribute > 0) {
        // Ordenar cuotas por fecha de vencimiento (más cercana primero)
        const sortedInstallments = savedInstallments
          .filter((inst) => inst.status !== StatusFinancingInstallments.PAID)
          .sort(
            (a, b) =>
              new Date(a.expectedPaymentDate).getTime() -
              new Date(b.expectedPaymentDate).getTime(),
          );

        let remainingToDistribute = amountToRedistribute;

        for (const installment of sortedInstallments) {
          if (remainingToDistribute <= 0) break;

          const currentPending = Number(installment.coutePending) || 0;

          if (currentPending > 0) {
            const amountToApply = Math.min(
              remainingToDistribute,
              currentPending,
            );

            installment.coutePaid = Number(
              (Number(installment.coutePaid) + amountToApply).toFixed(2),
            );
            installment.coutePending = Number(
              (currentPending - amountToApply).toFixed(2),
            );

            // Si quedó completamente pagada, cambiar estado
            if (installment.coutePending <= 0) {
              installment.status = StatusFinancingInstallments.PAID;
            }

            remainingToDistribute = Number(
              (remainingToDistribute - amountToApply).toFixed(2),
            );

            await financingInstallmentsRepo.save(installment);
          }
        }

        // Si sobra dinero después de distribuir a todas las cuotas, registrar advertencia
        if (remainingToDistribute > 0) {
          this.logger.warn(
            `[updateFinancingInstallments] Quedó un excedente de ${remainingToDistribute.toFixed(2)} después de redistribuir pagos. ` +
              `Este monto podría indicar un sobrepago.`,
          );
        }
      }

      // 12.4 Actualizar cantidad de cuotas en el financiamiento
      sale.financing.quantityCoutes = dto.installments.length;
      await financingRepo.save(sale.financing);

      // 12.5 Actualizar monto total de la venta si cambió
      if (dto.newTotalAmount !== undefined) {
        sale.totalAmount = dto.newTotalAmount;
        await saleRepo.save(sale);
      }
    });

    // 13. Retornar la respuesta
    const updatedSale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: ['financing', 'financing.financingInstallments'],
    });

    return {
      message:
        amountToRedistribute > 0
          ? `Cuotas actualizadas correctamente. Se redistribuyó ${amountToRedistribute.toFixed(2)} de pagos previos.`
          : 'Cuotas actualizadas correctamente',
      redistributedAmount:
        amountToRedistribute > 0 ? amountToRedistribute : undefined,
      financing: {
        id: updatedSale.financing.id,
        initialAmount: updatedSale.financing.initialAmount,
        quantityCoutes: updatedSale.financing.quantityCoutes,
        installments: updatedSale.financing.financingInstallments
          .sort((a, b) => a.numberCuote - b.numberCuote)
          .map((inst) => ({
            id: inst.id,
            numberCuote: inst.numberCuote,
            couteAmount: Number(inst.couteAmount),
            coutePending: Number(inst.coutePending),
            coutePaid: Number(inst.coutePaid),
            expectedPaymentDate: inst.expectedPaymentDate,
            lateFeeAmount: Number(inst.lateFeeAmount) || 0,
            lateFeeAmountPending: Number(inst.lateFeeAmountPending) || 0,
            lateFeeAmountPaid: Number(inst.lateFeeAmountPaid) || 0,
            status: inst.status,
          })),
      },
    };
  }

  // ============================================================
  // OBTENER FINANCIAMIENTO CON CUOTAS Y DATOS DE VENTA
  // ============================================================

  async getFinancingWithInstallments(
    saleId: string,
    financingId: string,
  ): Promise<{
    sale: {
      id: string;
      status: string;
      type: string;
      totalAmount: number;
      totalAmountPaid: number;
      reservationAmount: number;
      contractDate: Date | null;
      client: {
        id: number;
        fullName: string;
        document: string;
        documentType: string;
      };
      lot: {
        id: string;
        name: string;
        block: string;
        stage: string;
        project: string;
      };
    };
    financing: {
      id: string;
      financingType: string;
      initialAmount: number;
      initialAmountPaid: number;
      initialAmountPending: number;
      interestRate: number;
      quantityCoutes: number;
      totalCouteAmount: number;
      totalPaid: number;
      totalPending: number;
      totalLateFee: number;
      totalLateFeeePending: number;
      totalLateFeePaid: number;
      installments: Array<{
        id: string;
        numberCuote: number;
        couteAmount: number;
        coutePending: number;
        coutePaid: number;
        expectedPaymentDate: Date;
        lateFeeAmount: number;
        lateFeeAmountPending: number;
        lateFeeAmountPaid: number;
        status: string;
      }>;
      amendmentHistory: Array<{
        id: string;
        fileUrl: string;
        totalCouteAmount: number;
        totalPaid: number;
        totalPending: number;
        totalLateFee: number;
        additionalAmount: number;
        previousInstallmentsCount: number;
        newInstallmentsCount: number;
        observation: string;
        createdAt: Date;
      }>;
    };
  }> {
    // Ejecutar todas las consultas en paralelo para optimizar
    const [saleData, installmentsWithTotals, amendmentHistory] =
      await Promise.all([
        // 1. Consulta optimizada para datos de venta con QueryBuilder
        this.saleRepository
          .createQueryBuilder('sale')
          .select([
            'sale.id',
            'sale.status',
            'sale.type',
            'sale.totalAmount',
            'sale.totalAmountPaid',
            'sale.reservationAmount',
            'sale.contractDate',
          ])
          .leftJoin('sale.client', 'client')
          .addSelect(['client.id'])
          .leftJoin('client.lead', 'lead')
          .addSelect([
            'lead.firstName',
            'lead.lastName',
            'lead.document',
            'lead.documentType',
          ])
          .leftJoin('sale.lot', 'lot')
          .addSelect(['lot.id', 'lot.name'])
          .leftJoin('lot.block', 'block')
          .addSelect(['block.name'])
          .leftJoin('block.stage', 'stage')
          .addSelect(['stage.name'])
          .leftJoin('stage.project', 'project')
          .addSelect(['project.name'])
          .leftJoin('sale.financing', 'financing')
          .addSelect([
            'financing.id',
            'financing.financingType',
            'financing.initialAmount',
            'financing.initialAmountPaid',
            'financing.initialAmountPending',
            'financing.interestRate',
            'financing.quantityCoutes',
          ])
          .where('sale.id = :saleId', { saleId })
          .getOne(),

        // 2. Consulta para cuotas con totales calculados en la base de datos
        this.saleRepository.manager
          .createQueryBuilder()
          .select([
            'fi.id as id',
            'fi."numberCuote" as "numberCuote"',
            'fi."couteAmount" as "couteAmount"',
            'fi."coutePending" as "coutePending"',
            'fi."coutePaid" as "coutePaid"',
            'fi."expectedPaymentDate" as "expectedPaymentDate"',
            'fi."lateFeeAmount" as "lateFeeAmount"',
            'fi."lateFeeAmountPending" as "lateFeeAmountPending"',
            'fi."lateFeeAmountPaid" as "lateFeeAmountPaid"',
            'fi.status as status',
          ])
          .from('financing_installments', 'fi')
          .innerJoin('financing', 'f', 'fi."financingId" = f.id')
          .where('f.id = :financingId', { financingId })
          .orderBy('fi."numberCuote"', 'ASC')
          .getRawMany()
          .then(async (installments) => {
            // Calcular totales con una consulta separada agregada
            const totalsResult = await this.saleRepository.manager
              .createQueryBuilder()
              .select([
                'COALESCE(SUM(fi."couteAmount"), 0) as "totalCouteAmount"',
                'COALESCE(SUM(fi."coutePaid"), 0) as "totalPaid"',
                'COALESCE(SUM(fi."coutePending"), 0) as "totalPending"',
                'COALESCE(SUM(fi."lateFeeAmount"), 0) as "totalLateFee"',
                'COALESCE(SUM(fi."lateFeeAmountPending"), 0) as "totalLateFeeePending"',
                'COALESCE(SUM(fi."lateFeeAmountPaid"), 0) as "totalLateFeePaid"',
              ])
              .from('financing_installments', 'fi')
              .innerJoin('financing', 'f', 'fi."financingId" = f.id')
              .where('f.id = :financingId', { financingId })
              .getRawOne();

            return { installments, totals: totalsResult };
          }),

        // 3. Historial de adendas
        this.amendmentHistoryRepository
          .createQueryBuilder('ah')
          .select([
            'ah.id',
            'ah.fileUrl',
            'ah.totalCouteAmount',
            'ah.totalPaid',
            'ah.totalPending',
            'ah.totalLateFee',
            'ah.additionalAmount',
            'ah.previousInstallmentsCount',
            'ah.newInstallmentsCount',
            'ah.observation',
            'ah.createdAt',
          ])
          .where('ah.financingId = :financingId', { financingId })
          .orderBy('ah.createdAt', 'DESC')
          .getMany(),
      ]);

    // Validaciones
    if (!saleData) {
      throw new NotFoundException(`La venta con ID ${saleId} no existe`);
    }

    if (!saleData.financing || saleData.financing.id !== financingId) {
      throw new BadRequestException(
        `El financiamiento con ID ${financingId} no corresponde a la venta ${saleId}`,
      );
    }

    const { installments, totals } = installmentsWithTotals;

    // Construir la respuesta
    return {
      sale: {
        id: saleData.id,
        status: saleData.status,
        type: saleData.type,
        totalAmount: Number(saleData.totalAmount),
        totalAmountPaid: Number(saleData.totalAmountPaid) || 0,
        reservationAmount: Number(saleData.reservationAmount) || 0,
        contractDate: saleData.contractDate,
        client: {
          id: saleData.client.id,
          fullName:
            `${saleData.client.lead.firstName} ${saleData.client.lead.lastName}`.trim(),
          document: saleData.client.lead.document,
          documentType: saleData.client.lead.documentType,
        },
        lot: {
          id: saleData.lot.id,
          name: saleData.lot.name,
          block: saleData.lot.block.name,
          stage: saleData.lot.block.stage.name,
          project: saleData.lot.block.stage.project.name,
        },
      },
      financing: {
        id: saleData.financing.id,
        financingType: saleData.financing.financingType,
        initialAmount: Number(saleData.financing.initialAmount),
        initialAmountPaid: Number(saleData.financing.initialAmountPaid) || 0,
        initialAmountPending:
          Number(saleData.financing.initialAmountPending) || 0,
        interestRate: Number(saleData.financing.interestRate) || 0,
        quantityCoutes: Number(saleData.financing.quantityCoutes),
        totalCouteAmount: Number(totals.totalCouteAmount),
        totalPaid: Number(totals.totalPaid),
        totalPending: Number(totals.totalPending),
        totalLateFee: Number(totals.totalLateFee),
        totalLateFeeePending: Number(totals.totalLateFeeePending),
        totalLateFeePaid: Number(totals.totalLateFeePaid),
        installments: installments.map((inst) => ({
          id: inst.id,
          numberCuote: inst.numberCuote,
          couteAmount: Number(inst.couteAmount),
          coutePending: Number(inst.coutePending),
          coutePaid: Number(inst.coutePaid),
          expectedPaymentDate: inst.expectedPaymentDate,
          lateFeeAmount: Number(inst.lateFeeAmount) || 0,
          lateFeeAmountPending: Number(inst.lateFeeAmountPending) || 0,
          lateFeeAmountPaid: Number(inst.lateFeeAmountPaid) || 0,
          status: inst.status,
        })),
        amendmentHistory: amendmentHistory.map((h) => ({
          id: h.id,
          fileUrl: h.fileUrl,
          totalCouteAmount: Number(h.totalCouteAmount),
          totalPaid: Number(h.totalPaid),
          totalPending: Number(h.totalPending),
          totalLateFee: Number(h.totalLateFee),
          additionalAmount: Number(h.additionalAmount),
          previousInstallmentsCount: h.previousInstallmentsCount,
          newInstallmentsCount: h.newInstallmentsCount,
          observation: h.observation,
          createdAt: h.createdAt,
        })),
      },
    };
  }

  // ============================================================
  // CREAR ADENDA DE FINANCIAMIENTO
  // ============================================================

  async createFinancingAmendment(
    saleId: string,
    financingId: string,
    dto: CreateFinancingAmendmentDto,
  ): Promise<{
    message: string;
    historyId: string;
    fileUrl: string;
    financing: any;
  }> {
    // 1. Obtener la venta con todas las relaciones necesarias
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: [
        'client',
        'client.lead',
        'lot',
        'lot.block',
        'lot.block.stage',
        'lot.block.stage.project',
        'financing',
        'financing.financingInstallments',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`La venta con ID ${saleId} no existe`);
    }

    if (!sale.financing || sale.financing.id !== financingId) {
      throw new BadRequestException(
        `El financiamiento con ID ${financingId} no corresponde a la venta ${saleId}`,
      );
    }

    // 2. Validar que no hay pagos pendientes de aprobación
    if (
      sale.status === StatusSale.PENDING_APPROVAL ||
      sale.status === StatusSale.RESERVATION_PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        'No se puede crear adenda porque la venta tiene un pago pendiente de aprobación',
      );
    }

    // 3. Calcular totales ANTES de cualquier cambio (usando Decimal.js para precisión)
    const existingInstallments = sale.financing.financingInstallments || [];

    // Usar Decimal.js para cálculos precisos
    let decTotalCouteAmount = new Decimal(0);
    let decTotalPaid = new Decimal(0);
    let decTotalPending = new Decimal(0);
    let decTotalLateFee = new Decimal(0);
    let decTotalLateFeePending = new Decimal(0);
    let decTotalLateFeePaid = new Decimal(0);

    for (const inst of existingInstallments) {
      decTotalCouteAmount = decTotalCouteAmount.plus(inst.couteAmount || 0);
      decTotalPaid = decTotalPaid.plus(inst.coutePaid || 0);
      decTotalPending = decTotalPending.plus(inst.coutePending || 0);
      decTotalLateFee = decTotalLateFee.plus(inst.lateFeeAmount || 0);
      decTotalLateFeePending = decTotalLateFeePending.plus(
        inst.lateFeeAmountPending || 0,
      );
      decTotalLateFeePaid = decTotalLateFeePaid.plus(
        inst.lateFeeAmountPaid || 0,
      );
    }

    // Convertir a objeto con valores numéricos redondeados
    const totals = {
      totalCouteAmount: decTotalCouteAmount.toDecimalPlaces(2).toNumber(),
      totalPaid: decTotalPaid.toDecimalPlaces(2).toNumber(),
      totalPending: decTotalPending.toDecimalPlaces(2).toNumber(),
      totalLateFee: decTotalLateFee.toDecimalPlaces(2).toNumber(),
      totalLateFeePending: decTotalLateFeePending.toDecimalPlaces(2).toNumber(),
      totalLateFeePaid: decTotalLateFeePaid.toDecimalPlaces(2).toNumber(),
    };

    // 4. Calcular el monto que deben sumar las nuevas cuotas (usando Decimal.js)
    // total = (totalCouteAmount + totalLateFee) + additionalAmount - totalPaid - totalLateFeePaid
    const decExpectedNewTotal = decTotalCouteAmount
      .plus(decTotalLateFee)
      .plus(dto.additionalAmount)
      .minus(decTotalPaid)
      .minus(decTotalLateFeePaid)
      .toDecimalPlaces(2);

    const expectedNewTotal = decExpectedNewTotal.toNumber();

    // 5. La primera cuota debe ser la suma de lo pagado
    const decPaidInstallmentAmount = decTotalPaid
      .plus(decTotalLateFeePaid)
      .toDecimalPlaces(2);
    const paidInstallmentAmount = decPaidInstallmentAmount.toNumber();

    // 6. Validar que la primera cuota tenga el monto correcto (lo pagado)
    if (dto.installments.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos una cuota');
    }

    const firstInstallment = dto.installments.find((i) => i.numberCuote === 1);
    if (!firstInstallment) {
      throw new BadRequestException('Debe existir una cuota con número 1');
    }

    if (paidInstallmentAmount > 0) {
      const decFirstAmount = new Decimal(firstInstallment.amount);
      const amountDiff = decFirstAmount.minus(decPaidInstallmentAmount).abs();

      if (amountDiff.greaterThan(0.01)) {
        throw new BadRequestException(
          `La primera cuota debe tener el monto total pagado: ${paidInstallmentAmount.toFixed(2)}. ` +
            `Monto recibido: ${firstInstallment.amount.toFixed(2)}`,
        );
      }
    }

    // 7. Calcular suma de las nuevas cuotas (excluyendo la primera si es la pagada)
    let decSumNewInstallments = new Decimal(0);
    for (const inst of dto.installments) {
      if (paidInstallmentAmount > 0 && inst.numberCuote === 1) {
        // La primera cuota es la pagada, no se suma al pendiente
        continue;
      }
      decSumNewInstallments = decSumNewInstallments.plus(inst.amount);
    }
    decSumNewInstallments = decSumNewInstallments.toDecimalPlaces(2);
    const sumNewInstallments = decSumNewInstallments.toNumber();

    // 8. Validar que la suma coincida
    const decDifference = decSumNewInstallments
      .minus(decExpectedNewTotal)
      .abs();
    if (decDifference.greaterThan(1.0)) {
      throw new BadRequestException(
        `La suma de las nuevas cuotas pendientes (${sumNewInstallments.toFixed(2)}) no coincide con el monto esperado (${expectedNewTotal.toFixed(2)}). ` +
          `Diferencia: ${decDifference.toNumber().toFixed(2)}. ` +
          `Fórmula: (${totals.totalCouteAmount} + ${totals.totalLateFee}) + (${dto.additionalAmount}) - ${totals.totalPaid} - ${totals.totalLateFeePaid} = ${expectedNewTotal}`,
      );
    }

    // 9. Generar Excel con historial
    const excelWorkbook = await createAmendmentHistoryExcel(
      sale,
      sale.financing,
      existingInstallments,
      totals,
      dto.additionalAmount,
    );

    const excelBuffer = await excelWorkbook.xlsx.writeBuffer();
    const fileName = `adenda-${saleId}-${Date.now()}.xlsx`;
    const fileUrl = await this.awsS3Service.uploadExcelFromBuffer(
      Buffer.from(excelBuffer),
      fileName,
      'amendments',
    );

    // 10. Ejecutar la actualización en una transacción
    let historyId: string;

    await this.transactionService.runInTransaction(async (queryRunner) => {
      const financingInstallmentsRepo = queryRunner.manager.getRepository(
        FinancingInstallments,
      );
      const financingRepo = queryRunner.manager.getRepository(Financing);
      const historyRepo = queryRunner.manager.getRepository(
        FinancingAmendmentHistory,
      );

      // 10.1 Guardar historial de la adenda
      const history = historyRepo.create({
        saleId,
        financingId,
        fileUrl,
        totalCouteAmount: totals.totalCouteAmount,
        totalPaid: totals.totalPaid,
        totalPending: totals.totalPending,
        totalLateFee: totals.totalLateFee,
        totalLateFeePending: totals.totalLateFeePending,
        totalLateFeePaid: totals.totalLateFeePaid,
        additionalAmount: dto.additionalAmount,
        previousInstallmentsCount: existingInstallments.length,
        newInstallmentsCount: dto.installments.length,
        previousInstallments: existingInstallments.map((inst) => ({
          id: inst.id,
          numberCuote: inst.numberCuote,
          couteAmount: Number(inst.couteAmount),
          coutePaid: Number(inst.coutePaid),
          coutePending: Number(inst.coutePending),
          lateFeeAmount: Number(inst.lateFeeAmount) || 0,
          status: inst.status,
        })),
        observation: dto.observation,
        financing: sale.financing,
      });

      const savedHistory = await historyRepo.save(history);
      historyId = savedHistory.id;

      // 10.2 Eliminar TODAS las cuotas existentes
      for (const inst of existingInstallments) {
        await financingInstallmentsRepo.remove(inst);
      }

      // 10.3 Crear las nuevas cuotas
      for (const inst of dto.installments) {
        const isPaidInstallment =
          paidInstallmentAmount > 0 && inst.numberCuote === 1;

        const newInstallment = financingInstallmentsRepo.create({
          numberCuote: inst.numberCuote,
          couteAmount: inst.amount,
          coutePaid: isPaidInstallment ? inst.amount : 0,
          coutePending: isPaidInstallment ? 0 : inst.amount,
          expectedPaymentDate: new Date(inst.dueDate),
          lateFeeAmount: 0,
          lateFeeAmountPending: 0,
          lateFeeAmountPaid: 0,
          status: isPaidInstallment
            ? StatusFinancingInstallments.PAID
            : StatusFinancingInstallments.PENDING,
          financing: sale.financing,
        });

        await financingInstallmentsRepo.save(newInstallment);
      }

      // 10.4 Actualizar el financiamiento
      const amendmentEntry = {
        date: new Date().toISOString(),
        additionalAmount: dto.additionalAmount,
        previousTotal: totals.totalCouteAmount + totals.totalLateFee,
        newTotal:
          totals.totalCouteAmount + totals.totalLateFee + dto.additionalAmount,
        previousInstallmentsCount: existingInstallments.length,
        newInstallmentsCount: dto.installments.length,
        historyId,
      };

      sale.financing.quantityCoutes = dto.installments.length;
      sale.financing.amendmentHistory = [
        ...(sale.financing.amendmentHistory || []),
        amendmentEntry,
      ];

      await financingRepo.save(sale.financing);
    });

    // 11. Obtener la venta actualizada
    const updatedSale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: ['financing', 'financing.financingInstallments'],
    });

    return {
      message: `Adenda creada correctamente. Se redistribuyeron ${dto.installments.length} cuotas.`,
      historyId,
      fileUrl,
      financing: {
        id: updatedSale.financing.id,
        quantityCoutes: updatedSale.financing.quantityCoutes,
        amendmentHistory: updatedSale.financing.amendmentHistory,
        installments: updatedSale.financing.financingInstallments
          .sort((a, b) => a.numberCuote - b.numberCuote)
          .map((inst) => ({
            id: inst.id,
            numberCuote: inst.numberCuote,
            couteAmount: Number(inst.couteAmount),
            coutePending: Number(inst.coutePending),
            coutePaid: Number(inst.coutePaid),
            expectedPaymentDate: inst.expectedPaymentDate,
            status: inst.status,
          })),
      },
    };
  }

  // ============================================================
  // PAGO DE CUOTAS AUTO-APROBADO (ADM)
  // ============================================================

  async paidInstallmentsAutoApproved(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
  ) {
    return await this.financingInstallmentsService.payInstallmentsAutoApproved(
      financingId,
      amountPaid,
      paymentDetails,
      files,
      userId,
      dateOperation,
      numberTicket,
    );
  }

  // ============================================================
  // PAGO DE MORAS AUTO-APROBADO (ADM)
  // ============================================================

  async paidLateFeesAutoApproved(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
  ) {
    return await this.financingInstallmentsService.payLateFeesAutoApproved(
      financingId,
      amountPaid,
      paymentDetails,
      files,
      userId,
      dateOperation,
      numberTicket,
    );
  }
}
