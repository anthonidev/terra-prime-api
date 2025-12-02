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
import { MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
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
import { SaleResponse } from './interfaces/sale-response.interface';
import { SaleWithCombinedInstallmentsResponse } from './interfaces/sale-with-combined-installments-response.interface';
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

// SERVICIO ACTUALIZADO - UN SOLO ENDPOINT PARA VENTA/RESERVA

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
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    private readonly guarantorService: GuarantorsService,
    @Inject(forwardRef(() => UrbanDevelopmentService))
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
    // ELIMINAR: private readonly reservationService: ReservationsService,
    private readonly paymentsService: PaymentsService,
    private readonly secondaryClientService: SecondaryClientService,
    private readonly participantsService: ParticipantsService,
    private readonly adminTokenService: AdminTokenService,
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
      reservationAmountPending: createSaleDto.isReservation ? reservationAmount : null,
      maximumHoldPeriod: createSaleDto.maximumHoldPeriod || null,
      // Campos de pago total (para venta directa)
      totalAmountPaid: 0,
      totalAmountPending: createSaleDto.saleType === SaleType.DIRECT_PAYMENT && !createSaleDto.isReservation
        ? totalAmount
        : (createSaleDto.saleType === SaleType.DIRECT_PAYMENT && createSaleDto.isReservation
          ? totalAmount - reservationAmount
          : null),
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

  // ACTUALIZAR QUERIES - ELIMINAR JOINS CON RESERVATION
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
      // ELIMINAR: .leftJoinAndSelect('sale.reservation', 'reservation')
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

  // ACTUALIZAR MÉTODO DE PAGO
  private async isValidDataPaymentSale(
    sale: SaleWithCombinedInstallmentsResponse,
    paymentDetails: CreateDetailPaymentDto[],
  ): Promise<CreatePaymentDto> {
    let paymentDto: CreatePaymentDto;

    // Calcular monto total del pago basado en los detalles
    const totalPaymentAmount = paymentDetails.reduce((sum, detail) => sum + detail.amount, 0);

    // Validar que el monto sea positivo
    if (totalPaymentAmount <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0');
    }

    // ========== PAGO DE RESERVA ==========
    if (sale.status === StatusSale.RESERVATION_PENDING || sale.status === StatusSale.RESERVATION_IN_PAYMENT) {
      if (!sale.reservationAmount)
        throw new BadRequestException('No se encontró monto de reserva para esta venta');

      // Calcular monto pendiente
      const amountPending = Number((Number(sale.reservationAmount) - Number(sale.reservationAmountPaid || 0)).toFixed(2));

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de reserva ($${amountPending.toFixed(2)})`
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
        },
        paymentDetails,
      };
    }
    // ========== PAGO DE VENTA DIRECTA ==========
    else if (
      (sale.status === StatusSale.RESERVED || sale.status === StatusSale.PENDING || sale.status === StatusSale.IN_PAYMENT) &&
      sale.type === SaleType.DIRECT_PAYMENT
    ) {
      const reservationAmount = sale.fromReservation && sale.reservationAmount ? sale.reservationAmount : 0;
      const totalToPay = Number((Number(sale.totalAmount) - Number(reservationAmount)).toFixed(2));

      // Calcular monto pendiente
      const amountPending = Number((totalToPay - Number(sale.totalAmountPaid || 0)).toFixed(2));

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de la venta ($${amountPending.toFixed(2)})`
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
        },
        paymentDetails,
      };
    }
    // ========== PAGO INICIAL DE FINANCIAMIENTO ==========
    else if (
      (sale.status === StatusSale.RESERVED || sale.status === StatusSale.PENDING || sale.status === StatusSale.IN_PAYMENT) &&
      sale.type === SaleType.FINANCED
    ) {
      const reservationAmount = sale.fromReservation && sale.reservationAmount ? sale.reservationAmount : 0;
      const initialToPay = Number((Number(sale.financing.lot.initialAmount) - Number(reservationAmount)).toFixed(2));

      // Calcular monto pendiente
      const amountPending = Number((initialToPay - Number(sale.financing.lot.initialAmountPaid || 0)).toFixed(2));

      // Validar que el pago no exceda el pendiente
      if (totalPaymentAmount > amountPending) {
        throw new BadRequestException(
          `El monto del pago ($${totalPaymentAmount.toFixed(2)}) excede el monto pendiente de la inicial ($${amountPending.toFixed(2)})`
        );
      }

      paymentDto = {
        methodPayment: MethodPayment.VOUCHER,
        amount: totalPaymentAmount,
        relatedEntityType: 'financing',
        relatedEntityId: sale.financing.id,
        metadata: {
          'Concepto de pago': 'Pago inicial de financiamiento',
          'Fecha de pago': new Date().toISOString(),
          'Monto de pago': totalPaymentAmount,
          'Monto pendiente antes de pago': amountPending,
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
    // Obtener la venta (sin reservation join)
    const sale = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
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

    // 2. Pagos de financiación (si existe)
    let financingPayments = [];
    if (sale.financing) {
      financingPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financing',
          sale.financing.id,
        );
    }

    // 3. Si es una reserva, incluir pagos de reserva
    let reservationPayments = [];
    if (sale.fromReservation) {
      // Los pagos de reserva ahora están asociados directamente a la venta
      // Usando un campo relatedEntityType específico para reservas
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

    // Obtener cuotas del lote con payments
    let lotInstallmentsWithPayments: InstallmentWithPayments[] = [];
    if (sale.financing)
      lotInstallmentsWithPayments =
        await this.financingInstallmentsService.getInstallmentsWithPayments(
          sale.financing.id,
        );

    // Obtener cuotas de HU con payments
    let huInstallmentsWithPayments: InstallmentWithPayments[] = [];
    if (sale.urbanDevelopment?.financing)
      huInstallmentsWithPayments =
        await this.financingInstallmentsService.getInstallmentsWithPayments(
          sale.urbanDevelopment.financing.id,
        );

    // Combinar cuotas por fecha
    const combinedInstallments = this.combinInstallmentsByDate(
      lotInstallmentsWithPayments,
      huInstallmentsWithPayments,
    );

    // Calcular metadata
    const lotTotalAmount = lotInstallmentsWithPayments.reduce(
      (sum, inst) => sum + Number(inst.couteAmount),
      0,
    );
    const huTotalAmount = huInstallmentsWithPayments.reduce(
      (sum, inst) => sum + Number(inst.couteAmount),
      0,
    );

    const meta = {
      lotInstallmentsCount: lotInstallmentsWithPayments.length,
      lotTotalAmount: parseFloat(lotTotalAmount.toFixed(2)),
      huInstallmentsCount: huInstallmentsWithPayments.length,
      huTotalAmount: parseFloat(huTotalAmount.toFixed(2)),
      totalInstallmentsCount: combinedInstallments.length,
      totalAmount: parseFloat((lotTotalAmount + huTotalAmount).toFixed(2)),
    };

    const formattedSale = formatSaleResponse(sale);

    return {
      id: formattedSale.id,
      type: formattedSale.type,
      totalAmount: formattedSale.totalAmount,
      contractDate: formattedSale.contractDate,
      status: formattedSale.status,
      currency: formattedSale.currency,
      createdAt: formattedSale.createdAt,
      reservationAmount: formattedSale.reservationAmount,
      maximumHoldPeriod: formattedSale.maximumHoldPeriod,
      fromReservation: formattedSale.fromReservation,
      client: formattedSale.client,
      secondaryClients: formattedSale.secondaryClients,
      lot: formattedSale.lot,
      radicationPdfUrl: formattedSale.radicationPdfUrl,
      paymentAcordPdfUrl: formattedSale.paymentAcordPdfUrl,
      financing: sale.financing
        ? {
            id: sale.financing.id,
            lot: {
              id: sale.financing.id,
              initialAmount: sale.financing.initialAmount,
              interestRate: sale.financing.interestRate,
              quantityCoutes: sale.financing.quantityCoutes,
            },
            urbanDevelopment: sale.urbanDevelopment
              ? {
                  id: sale.urbanDevelopment.id,
                  amount: sale.urbanDevelopment.amount,
                  initialAmount: sale.urbanDevelopment.initialAmount,
                  status: sale.urbanDevelopment.status,
                  financing: sale.urbanDevelopment.financing
                    ? {
                        id: sale.urbanDevelopment.financing.id,
                        initialAmount:
                          sale.urbanDevelopment.financing.initialAmount,
                        interestRate:
                          sale.urbanDevelopment.financing.interestRate,
                        quantityCoutes:
                          sale.urbanDevelopment.financing.quantityCoutes,
                      }
                    : undefined,
                }
              : undefined,
            installments: combinedInstallments,
            meta,
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

  async deleteSale(
    saleId: string,
    token: string,
  ): Promise<{ message: string }> {
    try {
      // 1. Validar el token
      await this.adminTokenService.validateToken(token);
      // 2. Buscar la venta con todas sus relaciones
      const sale = await this.saleRepository.findOne({
        where: { id: saleId },
        relations: [
          'lot',
          'financing',
          'financing.financingInstallments',
          'urbanDevelopment',
          'urbanDevelopment.financing',
          'secondaryClientSales',
        ],
      });
      if (!sale)
        throw new NotFoundException(`La venta con ID ${saleId} no existe`);
      // 3. Validar que la venta esté en estado PENDING o RESERVATION_PENDING
      if (
        sale.status !== StatusSale.PENDING &&
        sale.status !== StatusSale.RESERVATION_PENDING
      )
        throw new BadRequestException(
          'Solo se pueden eliminar ventas en estado PENDING o RESERVATION_PENDING',
        );
      // 4. Eliminar la venta y todas sus relaciones en una transacción
      await this.transactionService.runInTransaction(
        async (queryRunner: QueryRunner) => {
          // Eliminar urban development si existe
          if (sale.urbanDevelopment)
            await this.urbanDevelopmentService.remove(
              sale.urbanDevelopment.id,
              queryRunner,
            );
          // Eliminar financing si existe
          if (sale.financing)
            await this.financingService.remove(sale.financing.id, queryRunner);
          // Eliminar secondary clients sale relations
          if (sale.secondaryClientSales && sale.secondaryClientSales.length > 0)
            for (const secondaryClientSale of sale.secondaryClientSales) {
              await this.secondaryClientService.removeSecondaryClientSale(
                secondaryClientSale.id,
                queryRunner,
              );
            }
          // Liberar el lote (cambiar estado a ACTIVE)
          if (sale.lot) {
            await this.lotService.updateStatus(
              sale.lot.id,
              LotStatus.ACTIVE,
              queryRunner,
            );
          }
          // Finalmente, eliminar la venta
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
}
