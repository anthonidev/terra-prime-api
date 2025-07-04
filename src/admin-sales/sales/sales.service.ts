import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
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
import { PaginationDto } from 'src/common/dto/paginationDto';
import { PaymentsService } from 'src/admin-payments/payments/services/payments.service';
import { CreatePaymentDto } from 'src/admin-payments/payments/dto/create-payment.dto';
import { PaymentResponse } from 'src/admin-payments/payments/interfaces/payment-response.interface';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { query } from 'express';
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
    private readonly guarantorService: GuarantorsService,
    @Inject(forwardRef(() => UrbanDevelopmentService))
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
    // ELIMINAR: private readonly reservationService: ReservationsService,
    private readonly paymentsService: PaymentsService,
    private readonly secondaryClientService: SecondaryClientService,
    private readonly participantsService: ParticipantsService,
  ) {}

  async create(
    createSaleDto: CreateSaleDto,
    userId: string,
  ): Promise<SaleResponse> {
    try {
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

      if (isReservation) await this.validateReservationData(reservationAmount, maximumHoldPeriod);

      // Validaciones comunes
      await Promise.all([
        this.clientService.isValidClient(clientId),
        (guarantorId) ? this.guarantorService.isValidGuarantor(guarantorId) : null,
        ...secondaryClientsIds.map(id => this.secondaryClientService.isValidSecondaryClient(id)),
      ]);

      let sale;
      
      if (createSaleDto.saleType === SaleType.DIRECT_PAYMENT) {
        sale = await this.handleSaleCreation(createSaleDto, userId, async (queryRunner, data) => {
          return await this.createSale(data, userId, null, queryRunner);
        });
      }
      
      if (createSaleDto.saleType === SaleType.FINANCED) {
        sale = await this.handleSaleCreation(createSaleDto, userId, async (queryRunner, data) => {
          const { initialAmount, interestRate, quantitySaleCoutes, totalAmount, financingInstallments } = data;
          
          this.isValidFinancingDataSale(
            totalAmount,
            data.reservationAmount || 0, // Usar reservationAmount del DTO
            initialAmount,
            interestRate,
            quantitySaleCoutes,
            financingInstallments
          );
          
          const financingData = {
            financingType: FinancingType.CREDITO,
            initialAmount,
            interestRate,
            quantityCoutes: quantitySaleCoutes,
            financingInstallments: financingInstallments
          };
          
          const financingSale = await this.financingService.create(financingData, queryRunner);
          return await this.createSale(data, userId, financingSale.id, queryRunner);
        });
      }
      
      return await this.findOneById(sale.id);
    } catch (error) {
      throw error;
    }
  }

  private async handleSaleCreation(
    createSaleDto: CreateSaleDto,
    userId: string,
    saleSpecificLogic: (queryRunner: QueryRunner, createSaleDto: CreateSaleDto) => Promise<Sale>,
  ) {
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const savedSale = await saleSpecificLogic(queryRunner, createSaleDto);
      
      // Agregar clientes secundarios
      const { secondaryClientsIds } = createSaleDto;
      if (secondaryClientsIds && secondaryClientsIds.length > 0) {
        await Promise.all(
          createSaleDto.secondaryClientsIds.map(async (id) => {
            const secondaryClientSale = await this.secondaryClientService.createSecondaryClientSale(savedSale.id, id, queryRunner);
            return secondaryClientSale;
          }),
        );
      }
      
      // Actualizar estado del lote
      const lotStatus = savedSale.fromReservation ? LotStatus.RESERVED : LotStatus.SOLD;
      await this.lotService.updateStatus(savedSale.lot.id, lotStatus, queryRunner);
      
      // Manejar habilitación urbana si corresponde
      if (createSaleDto.totalAmountUrbanDevelopment === 0) return savedSale;
      
      this.isValidUrbanDevelopmentDataSale(
        createSaleDto.firstPaymentDateHu,
        createSaleDto.initialAmountUrbanDevelopment,
        createSaleDto.quantityHuCuotes,
      );
      
      const financingDataHu = this.calculateAndCreateFinancingHu(createSaleDto);
      const financingHu = await this.financingService.create(financingDataHu, queryRunner);
      await this.createUrbanDevelopment(savedSale.id, financingHu.id, createSaleDto, queryRunner);
      
      return savedSale;
    });
  }

  async createSale(
    createSaleDto: CreateSaleDto,
    userId: string,
    financingId?: string,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner 
      ? queryRunner.manager.getRepository(Sale) 
      : this.saleRepository;

    const sale = repository.create({
      lot: { id: createSaleDto.lotId },
      client: { id: createSaleDto.clientId },
      guarantor: createSaleDto.guarantorId ? { id: createSaleDto.guarantorId } : null,
      type: createSaleDto.saleType,
      vendor: { id: userId },
      totalAmount: createSaleDto.totalAmount,
      contractDate: createSaleDto.contractDate,
      financing: financingId ? { id: financingId } : null,
      
      // Campos de reserva
      fromReservation: createSaleDto.isReservation,
      reservationAmount: createSaleDto.reservationAmount || null,
      maximumHoldPeriod: createSaleDto.maximumHoldPeriod || null,
      // reservationDate: isReservation ? new Date() : null,
      status: createSaleDto.isReservation ? StatusSale.RESERVATION_PENDING : StatusSale.PENDING,
    });
    
    return await repository.save(sale);
  }

  // ACTUALIZAR QUERIES - ELIMINAR JOINS CON RESERVATION
  async findAll(paginationDto: PaginationDto, userId?: string): Promise<Paginated<SaleResponse>> {
    const { page = 1, limit = 10, order = 'DESC' } = paginationDto;
    const skip = (page - 1) * limit;

    let queryBuilder = this.saleRepository.createQueryBuilder('sale')
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
      .leftJoinAndSelect('financing.financingInstallments', 'financingInstallments')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect('secondaryClientSales.secondaryClient', 'secondaryClient')
      .leftJoinAndSelect('sale.liner', 'liner')
      .leftJoinAndSelect('sale.telemarketingSupervisor', 'telemarketingSupervisor')
      .leftJoinAndSelect('sale.telemarketingConfirmer', 'telemarketingConfirmer')
      .leftJoinAndSelect('sale.telemarketer', 'telemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'fieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'fieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'fieldSeller');

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
    return PaginationHelper.createPaginatedResponse(formattedSales, totalCount, paginationDto);
  }

  // ACTUALIZAR MÉTODO DE PAGO
  private async isValidDataPaymentSale(
    sale: SaleResponse,
    paymentDetails: CreateDetailPaymentDto[]
  ): Promise<CreatePaymentDto> {
    let paymentDto: CreatePaymentDto;

    // Pago de reserva
    if (sale.status === StatusSale.RESERVATION_PENDING) {
      if (!sale.reservationAmount)
        throw new BadRequestException('No se encontró monto de reserva para esta venta');
      
      paymentDto = {
        methodPayment: MethodPayment.VOUCHER,
        amount: sale.reservationAmount,
        relatedEntityType: 'reservation',
        relatedEntityId: sale.id,
        metadata: {
          'Concepto de pago': 'Pago de reserva de lote',
          'Fecha de pago': new Date().toISOString(),
          'Monto de pago': sale.reservationAmount,
        },
        paymentDetails
      };
    }
    // Pagos de venta (después de reserva aprobada o venta directa)
    else if (sale.status === StatusSale.RESERVED || sale.status === StatusSale.PENDING) {
      const reservationAmount = sale.fromReservation && sale.reservationAmount ? sale.reservationAmount : 0;
      
      if (sale.type === SaleType.DIRECT_PAYMENT) {
        paymentDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: sale.totalAmount - reservationAmount,
          relatedEntityType: 'sale', 
          relatedEntityId: sale.id,
          metadata: {
            'Concepto de pago': 'Monto total de la venta de lote',
            'Fecha de pago': new Date().toISOString(),
            'Monto de pago': sale.totalAmount - reservationAmount,
          },
          paymentDetails
        };
      } else if (sale.type === SaleType.FINANCED) {
        paymentDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: sale.financing.initialAmount - reservationAmount,
          relatedEntityType: 'financing', 
          relatedEntityId: sale.financing.id,
          metadata: {
            'Concepto de pago': 'Monto inicial de la venta de lote',
            'Fecha de pago': new Date().toISOString(),
            'Monto de pago': sale.financing.initialAmount - reservationAmount,
          },
          paymentDetails
        };
      }
    }
    else if (sale.status === StatusSale.PENDING_APPROVAL) {
      throw new BadRequestException('No se puede realizar pago porque la venta tiene un pago pendiente de aprobación');
    }
    else if (sale.status === StatusSale.RESERVATION_PENDING_APPROVAL) {
      throw new BadRequestException('No se puede realizar pago porque la reserva tiene un pago pendiente de aprobación');
    }
    else if (sale.status === StatusSale.IN_PAYMENT_PROCESS) {
      throw new BadRequestException('No se puede realizar pago directo desde la venta porque la venta está en proceso de pago de cuotas');
    }
    else if (sale.status === StatusSale.COMPLETED) {
      throw new BadRequestException('No se puede realizar pago directo desde la venta porque la venta ya se ha completado');
    }
    else if (sale.status === StatusSale.REJECTED) {
      throw new BadRequestException('No se puede realizar pago directo desde la venta porque la venta ha sido rechazada');
    }
    // Estados que no permiten pagos
    else {
      throw new BadRequestException(`No se puede realizar pago en el estado actual: ${sale.status}`);
    }
    
    return paymentDto;
  }

  // ACTUALIZAR MÉTODO getPaymentsSummaryForSale
  private async getPaymentsSummaryForSale(saleId: string): Promise<any[]> {
    // Obtener la venta (sin reservation join)
    const sale = await this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect('financing.financingInstallments', 'financingInstallments')
      .where('sale.id = :saleId', { saleId })
      .getOne();

    if (!sale)
      throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);

    // 1. Pagos directos a la venta
    const salePayments = await this.paymentsService.findPaymentsByRelatedEntity('sale', saleId);
    
    // 2. Pagos de financiación (si existe)
    let financingPayments = [];
    if (sale.financing) {
      financingPayments = await this.paymentsService.findPaymentsByRelatedEntity('financing', sale.financing.id);
    }
    
    // 3. Si es una reserva, incluir pagos de reserva
    let reservationPayments = [];
    if (sale.fromReservation) {
      // Los pagos de reserva ahora están asociados directamente a la venta
      // Usando un campo relatedEntityType específico para reservas
      reservationPayments = await this.paymentsService.findPaymentsByRelatedEntity('reservation', saleId);
    }
    
    // Combinar todos los pagos
    const allPayments = [
      ...salePayments,
      ...financingPayments,
      ...reservationPayments
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allPayments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      reviewedAt: payment.reviewedAt,
      reviewBy: payment.reviewedBy ? { 
        id: payment.reviewedBy.id,
        email: payment.reviewedBy.email 
      } : null,
      codeOperation: payment.codeOperation,
      banckName: payment.banckName,
      dateOperation: payment.dateOperation,
      numberTicket: payment.numberTicket,
      paymentConfig: payment.paymentConfig.name,
      reason: payment?.rejectionReason ? payment.rejectionReason : null,
    }));
  }

  // ACTUALIZAR TODOS LOS MÉTODOS findOne* PARA ELIMINAR RESERVATION JOINS
  async findOneById(id: string): Promise<SaleResponse> {
    const sale = await this.saleRepository.createQueryBuilder('sale')
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
      .leftJoinAndSelect('financing.financingInstallments', 'financingInstallments')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect('secondaryClientSales.secondaryClient', 'secondaryClient')
      .leftJoinAndSelect('sale.liner', 'liner')
      .leftJoinAndSelect('sale.telemarketingSupervisor', 'telemarketingSupervisor')
      .leftJoinAndSelect('sale.telemarketingConfirmer', 'telemarketingConfirmer')
      .leftJoinAndSelect('sale.telemarketer', 'telemarketer')
      .leftJoinAndSelect('sale.fieldManager', 'fieldManager')
      .leftJoinAndSelect('sale.fieldSupervisor', 'fieldSupervisor')
      .leftJoinAndSelect('sale.fieldSeller', 'fieldSeller')
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale)
      throw new NotFoundException(`La venta con ID ${id} no se encuentra registrada`);

    // Obtener resumen de pagos
    const paymentsSummary = await this.getPaymentsSummaryForSale(id);
    const formattedSale = formatSaleResponse(sale);

    return {
      ...formattedSale,
      paymentsSummary,
    };
  }

  async findOneByIdWithCollections(id: string): Promise<SaleResponse> {
    const sale = await this.saleRepository.createQueryBuilder('sale')
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
      .leftJoinAndSelect('financing.financingInstallments', 'financingInstallments')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect('secondaryClientSales.secondaryClient', 'secondaryClient')
      .where('sale.id = :id', { id })
      .getOne();

    if (!sale)
      throw new NotFoundException(`La venta con ID ${id} no se encuentra registrada`);
    
    return formatSaleCollectionResponse(sale);
  }

  async findAllByClient(clientId: number): Promise<SaleResponse[]> {
    const sales = await this.saleRepository.createQueryBuilder('sale')
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
      .leftJoinAndSelect('financing.financingInstallments', 'financingInstallments')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect('secondaryClientSales.secondaryClient', 'secondaryClient')
      .where('client.id = :clientId', { clientId })
      .andWhere('sale.type = :type', { type: SaleType.FINANCED })
      .andWhere('sale.status = :status', { status: StatusSale.IN_PAYMENT_PROCESS })
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
      throw new NotFoundException(`La venta con ID ${id} no se encuentra registrada`);
  }

  async findOneByIdFinancing(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { financing: { id } },
      relations: ['lot'],
    });
    if (!sale)
      throw new NotFoundException(`La venta no tiene un financiamiento con ID ${id}`);
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
          'lot.block.stage.project'
        ],
      });
  }

  async isValidSaleForWithdrawal(saleId: string) {
    const sale = await this.findOneById(saleId);
    if (!sale)
      throw new NotFoundException(`La venta con ID ${saleId} no se encuentra registrada`);
    if (sale.status == StatusSale.COMPLETED)
        throw new BadRequestException(`La venta con ID ${saleId} no se puede desistir porque ya fue completada`);
    if (sale.status == StatusSale.REJECTED)
        throw new BadRequestException(`La venta con ID ${saleId} no se puede desistir porque ya fue cancelada`);
  }

  async assignParticipantsToSale(
    saleId: string,
    assignParticipantsDto: AssignParticipantsToSaleDto,
  ): Promise<SaleResponse> {
    try {
      // Mapeo de campos DTO a validaciones de tipo
      const participantValidations = [
        { id: assignParticipantsDto.linerId, type: ParticipantType.LINER, field: 'liner' },
        { id: assignParticipantsDto.telemarketingSupervisorId, type: ParticipantType.TELEMARKETING_SUPERVISOR, field: 'telemarketingSupervisor' },
        { id: assignParticipantsDto.telemarketingConfirmerId, type: ParticipantType.TELEMARKETING_CONFIRMER, field: 'telemarketingConfirmer' },
        { id: assignParticipantsDto.telemarketerId, type: ParticipantType.TELEMARKETER, field: 'telemarketer' },
        { id: assignParticipantsDto.fieldManagerId, type: ParticipantType.FIELD_MANAGER, field: 'fieldManager' },
        { id: assignParticipantsDto.fieldSupervisorId, type: ParticipantType.FIELD_SUPERVISOR, field: 'fieldSupervisor' },
        { id: assignParticipantsDto.fieldSellerId, type: ParticipantType.FIELD_SELLER, field: 'fieldSeller' },
      ];

      // Validar participantes que se están asignando
      await Promise.all(participantValidations
        .filter(({ id }) => id !== undefined && id !== null)
        .map(({ id, type }) => this.participantsService.validateParticipantByType(id, type)));

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
        throw new NotFoundException(`La venta con ID ${saleId} no se encuentra registrada`);

      await this.saleRepository.save(saleToUpdate);
      return await this.findOneById(saleId);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al asignar participantes a la venta: ${error.message}`);
    }
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

  async findOneClientById(id: number): Promise<Client> {
    return await this.clientService.findOneById(id);
  }

  async findOneClientByDocument(document: string): Promise<ClientSaleResponse> {
    return await this.clientService.findOneByDocument(document);
  }

  async createClientAndGuarantor(data: {
    createClient: CreateClientDto,
    createGuarantor?: CreateGuarantorDto,
    createSecondaryClient?: CreateSecondaryClientDto[],
    document: string,
    userId: string
  }): Promise<ClientAndGuarantorResponse> {
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const { createClient, createGuarantor, createSecondaryClient = [], userId } = data;
      const  client = await this.clientService.createOrUpdate(createClient, userId, queryRunner);
      const guarantor = createGuarantor ? await this.guarantorService.createOrUpdate(createGuarantor, queryRunner) : null;
      let secondaryClientIds: number[] = [];

      if (createSecondaryClient && createSecondaryClient.length > 0) {
        const createdSecondaryClients = await Promise.all(
          createSecondaryClient.map(async (dto) => {
            const secondaryClient = await this.secondaryClientService.createOrUpdate(dto, userId, queryRunner);
            return secondaryClient.id;
          }),
        );
        secondaryClientIds = createdSecondaryClients;
      }
      return formatClientAndGuarantorResponse(client, guarantor, secondaryClientIds);
    });
  }

  calculateAmortization(
    calculateAmortizationDto: CalculateAmortizationDto,
  ): CalculateAmortizationResponse {
    const installments = this.financingService.generateAmortizationTable(
      calculateAmortizationDto.totalAmount,
      calculateAmortizationDto.initialAmount,
      calculateAmortizationDto.reservationAmount,
      calculateAmortizationDto.interestRate,
      calculateAmortizationDto.numberOfPayments,
      calculateAmortizationDto.firstPaymentDate,
      calculateAmortizationDto.includeDecimals,
    );
    const totalCouteAmountSum = installments.reduce((sum, installment) => sum + installment.couteAmount, 0);
    return {
      installments: installments.map((installment) => {
        const { couteAmount, expectedPaymentDate } = installment;
        return {
          couteAmount: couteAmount,
          expectedPaymentDate: expectedPaymentDate,
        };
      }),
      meta: {
        totalCouteAmountSum
      }
    };
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
      return await this.transactionService.runInTransaction(async (queryRunner) => {
        const paymentResult = await this.paymentsService.create(paymentDto, files, userId, queryRunner);
        return paymentResult;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
          throw error;
      }
      throw new BadRequestException(`Error al crear pago para venta: ${error.message}`);
    }
  }

  private isValidUrbanDevelopmentDataSale(
    datePayment: string,
    initialAmount: number,
    quantityHuCuotes: number,
  ): void {
    if (!datePayment)
      throw new BadRequestException('La fecha de pago inicial de la habilitación urbana es requerida');
    if (!initialAmount)
      throw new BadRequestException('El monto inicial de la habilitación urbana es requerido');
    if (!quantityHuCuotes)
      throw new BadRequestException('El número de cuotas de la habilitación urbana es requerida');
  }

  private async validateReservationData(reservationAmount: number, maximumHoldPeriod: number) {
    if (!reservationAmount || reservationAmount <= 0)
      throw new BadRequestException('El monto de reserva es requerido y debe ser mayor a cero');
    if (!maximumHoldPeriod || maximumHoldPeriod <= 0)
      throw new BadRequestException('El periodo de reserva es requerido y debe ser mayor a cero');
  }

  private calculateAndCreateFinancingHu(createSaleDto: CreateSaleDto) {
    const financingInstallmentsHu = this.calculateAmortization({
      totalAmount: createSaleDto.totalAmountUrbanDevelopment,
      initialAmount: createSaleDto.initialAmountUrbanDevelopment,
      reservationAmount: 0,
      interestRate: 0,
      numberOfPayments:createSaleDto.quantityHuCuotes,
      firstPaymentDate: createSaleDto.firstPaymentDateHu,
    });
      
    return {
      financingType: FinancingType.CREDITO,
      initialAmount: createSaleDto.initialAmountUrbanDevelopment,
      interestRate: 0,
      quantityCoutes: createSaleDto.quantityHuCuotes,
      initialPaymentDate: createSaleDto.firstPaymentDateHu,
      financingInstallments: financingInstallmentsHu.installments,
    }
  }

  private async createUrbanDevelopment(
    savedSaleId: string,
    financingHuId: string,
    createSaleDto: CreateSaleDto,
    queryRunner: QueryRunner,
  ) {
      await this.urbanDevelopmentService.create({
          saleId: savedSaleId,
          financingId: financingHuId,
          amount: createSaleDto.totalAmountUrbanDevelopment,
          initialAmount: createSaleDto.initialAmountUrbanDevelopment,
      }, queryRunner);
  }

  private isValidFinancingDataSale(
    totalAmount: number,
    reservationAmount: number,
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
      throw new BadRequestException('Las cuotas de financiación es requerida');
    if (financingInstallments.length !== quantitySaleCoutes)
      throw new BadRequestException(
        `El número de cuotas enviadas (${financingInstallments.length}) no coincide con la cantidad de cuotas esperada (${quantitySaleCoutes}).`
      );

    const sumOfInstallmentAmounts = financingInstallments.reduce((sum, installment) => sum + installment.couteAmount, 0);
    const calculatedAmortization = this.financingService.generateAmortizationTable(
      totalAmount,
      initialAmount,
      reservationAmount,
      interestRate,
      quantitySaleCoutes,
      financingInstallments[0]?.expectedPaymentDate.toString(),
      true
    );

    const expectedTotalAmortizedAmount = calculatedAmortization.reduce((sum, inst) => sum + inst.couteAmount, 0);

    if (Math.abs(sumOfInstallmentAmounts - expectedTotalAmortizedAmount) > 0.01)
      throw new BadRequestException(
        `La suma de los montos de las cuotas enviadas (${sumOfInstallmentAmounts.toFixed(2)}) no coincide con el monto total esperado según la amortización (${expectedTotalAmortizedAmount.toFixed(2)}).`
      );
  }
}