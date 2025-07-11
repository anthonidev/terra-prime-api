import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../entities/payment.entity';
import { TransactionService } from 'src/common/services/transaction.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { StatusPayment } from '../enums/status-payments.enum';
import { CreateDetailPaymentDto } from '../dto/create-detail-payment.dto';
import { PaymentsDetailService } from './payments-detail.service';
import { formatPaymentsResponse } from '../helpers/format-payments-response.helper';
import { PaymentResponse } from '../interfaces/payment-response.interface';
import { PaymentsConfigService } from 'src/admin-payments/payments-config/payments-config.service';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { StatusSale } from 'src/admin-sales/sales/enums/status-sale.enum';
import { StatusFinancingInstallments } from 'src/admin-sales/financing/enums/status-financing-installments.enum';
import { FinancingInstallmentsService } from 'src/admin-sales/financing/services/financing-installments.service';
import { ApprovePaymentDto } from '../dto/approve-payment.dto';
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';
import { LotService } from 'src/project/services/lot.service';
import { FindPaymentsDto } from '../dto/find-payments.dto';
import { PaginationHelper } from 'src/common/helpers/pagination.helper';
import { ReservationsService } from 'src/admin-sales/reservations/reservations.service';
import { FinancingService } from 'src/admin-sales/financing/services/financing.service';
import { PaymentAllResponse } from '../interfaces/payment-all-response.interface';
import { Paginated } from 'src/common/interfaces/paginated.interface';
import { CompletePaymentDto } from '../dto/complete-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentsDetailService: PaymentsDetailService,
    private readonly paymentConfigService: PaymentsConfigService,
    @Inject(forwardRef(() => SalesService))
    private readonly salesService: SalesService,
    private readonly transactionService: TransactionService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    private readonly financingService: FinancingService,
    private readonly reservationService: ReservationsService,
    private readonly lotService: LotService,
  ){}
  // Methods for endpoints
  async create(
    createPaymentDto: CreatePaymentDto,
    files: Express.Multer.File[],
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<PaymentResponse> {
    this.isValidPaymentsItems(createPaymentDto.amount, createPaymentDto.paymentDetails, files);
    const uploadedKeys: { detailId: number; urlKey: string }[] = [];
    try {
      const {
        amount,
        methodPayment,
        relatedEntityType,
        relatedEntityId,
        paymentDetails,
        metadata,
      } = createPaymentDto;

      const paymentConfig = await this.isValidPaymentConfig(relatedEntityType, relatedEntityId);
      const payment = this.paymentRepository.create({
        user: { id: userId },
        paymentConfig: { id: paymentConfig.id },
        amount: amount,
        status: StatusPayment.PENDING,
        methodPayment: methodPayment,
        relatedEntityType: relatedEntityType,
        relatedEntityId: relatedEntityId,
        metadata: metadata ? metadata : {},
      });
      const savedPayment = await queryRunner.manager.save(payment);
      await this.updateStatusSale(relatedEntityType, relatedEntityId, queryRunner);
      const createdVouchers = await Promise.all(
        files.map(async (file, i) => {
          const currentPaymentDetailDto = paymentDetails.find(detail => detail.fileIndex === i);
          if (!currentPaymentDetailDto) 
            throw new BadRequestException(`No se encontró detalle de pago para el archivo en el índice ${i}.`);
          const savedDetail = await this.paymentsDetailService.create(
            savedPayment.id,
            currentPaymentDetailDto,
            file,
            queryRunner,
          );
          uploadedKeys.push({ detailId: savedDetail.id, urlKey: savedDetail.urlKey });
          return {
            id: savedDetail.id,
            url: savedDetail.url,
            amount: savedDetail.amount,
            bankName: savedDetail.bankName,
            transactionReference: savedDetail.transactionReference,
            transactionDate: savedDetail.transactionDate,
          };
        })
      );
      return {
        ...formatPaymentsResponse(savedPayment),
        vouchers: createdVouchers,
      };

    } catch (error) {
      for (const { detailId, urlKey } of uploadedKeys) {
        try {
          await this.paymentsDetailService.delete(urlKey, detailId);
        } catch (deleteErr) {
          console.error(`Error al eliminar detalle de pago ${detailId} y archivo S3 ${urlKey} durante el rollback: ${deleteErr.message}`);
        }
      }
      throw error; 
    }
  }

  async approvePayment(
    paymentId: number,
    reviewedById: string,
    approvePaymentDto: ApprovePaymentDto,
  ): Promise<PaymentResponse> {
    const payment = await this.isValidPayment(paymentId);
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      payment.status = StatusPayment.APPROVED;
      payment.reviewedBy = { id: reviewedById } as any;
      payment.reviewedAt = new Date();
      payment.codeOperation = approvePaymentDto.codeOperation;
      payment.banckName = approvePaymentDto.banckName;
      payment.dateOperation = new Date(approvePaymentDto.dateOperation);
      payment.numberTicket = approvePaymentDto.numberTicket;
      payment.metadata = {
        "Configuración de Pago": payment.paymentConfig.code,
        "Estado del Pago": StatusPayment.APPROVED,
        "Monto": payment.amount,
        "Descripción": `Pago aprobado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
      };
      const approvedPayment = await queryRunner.manager.save(payment);
      await this.updateStatusApprovedPayment(payment, queryRunner);

      return {
        ...formatPaymentsResponse(approvedPayment),
        vouchers: payment.details.map(detail => ({
          id: detail.id,
          url: detail.url,
          amount: detail.amount,
          bankName: detail.bankName,
          transactionReference: detail.transactionReference,
          transactionDate: detail.transactionDate,
        })),
      };
    });
  }

  async rejectPayment(
  paymentId: number,
  rejectionReason: string,
  reviewedById: string,
): Promise<PaymentResponse> {
  const payment = await this.isValidPayment(paymentId);
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      payment.status = StatusPayment.REJECTED;
      payment.rejectionReason = rejectionReason;
      payment.reviewedBy = { id: reviewedById } as any;
      payment.reviewedAt = new Date();
      const canceledPayment = await queryRunner.manager.save(payment);

      if (payment.relatedEntityType === 'sale' && payment.relatedEntityId)
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.PENDING,
          queryRunner,
        );
      if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
        const sale = await this.salesService.findOneByIdFinancing(payment.relatedEntityId);
        await this.salesService.updateStatusSale(
          sale.id,
          StatusSale.PENDING,
          queryRunner,
        );
      }
      if (payment.relatedEntityType === 'reservation' && payment.relatedEntityId) {
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.RESERVATION_PENDING,
          queryRunner,
        );
      }
      if (payment.relatedEntityType === 'financingInstallments' && payment.relatedEntityId) {
        await this.revertInstallmentsPayment(paymentId, queryRunner);
      }

      return {
        ...formatPaymentsResponse(canceledPayment),
        vouchers: payment.details.map(detail => ({
          id: detail.id,
          url: detail.url,
          amount: detail.amount,
          bankName: detail.bankName,
          transactionReference: detail.transactionReference,
          transactionDate: detail.transactionDate,
        })),
      };
    });
  }

  async revertInstallmentsPayment(
    paymentId: number,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const payment = await queryRunner.manager.getRepository(Payment).findOne({
      where: { id: paymentId },
      relations: ['details']
    });

    if (!payment || !payment.metadata?.installmentsBackup) {
      throw new BadRequestException('No se encontró información de respaldo para revertir las cuotas');
    }

    try {
      const installmentsBackup = JSON.parse(payment.metadata.installmentsBackup);
      
      // Restaurar cada cuota a su estado anterior
      for (const backup of installmentsBackup) {
        await this.financingInstallmentsService.updateAmountsPayment(
          backup.id,
          backup.previousLateFeeAmountPending,
          backup.previousLateFeeAmountPaid,
          backup.previousCoutePending,
          backup.previousCoutePaid,
          backup.previousStatus,
          queryRunner,
        );
      }
    } catch (error) {
      throw new BadRequestException('Error al revertir las cuotas: ' + error.message);
    }
  }

  async findAllPayments(filters: FindPaymentsDto, userId?: string): Promise<Paginated<PaymentAllResponse>> {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        paymentConfigId,
        status,
        collectorId,
        order = 'DESC',
        search,
      } = filters;

      const queryBuilder = this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.paymentConfig', 'paymentConfig')
        .leftJoinAndSelect('payment.reviewedBy', 'reviewer')
        .leftJoinAndSelect('payment.user', 'user');

      if (paymentConfigId)
        queryBuilder.andWhere('payment.paymentConfig.id = :paymentConfigId', {
          paymentConfigId,
        });

      if (status)
        queryBuilder.andWhere('payment.status = :status', { status });

      if (startDate)
        queryBuilder.andWhere('payment.createdAt >= :startDate', {
          startDate: new Date(startDate),
        });

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('payment.createdAt <= :endDate', {
          endDate: endOfDay,
        });
      }

      if (search)
        queryBuilder.andWhere(
          '(user.email ILIKE :search)',
          { search: `%${search}%` },
        );

      if (userId)
        queryBuilder.andWhere('payment.user.id = :userId', { userId });

      if (collectorId)
        queryBuilder.andWhere('payment.user.id = :collectorId', { collectorId });

      queryBuilder
        .orderBy('payment.createdAt', order)
        .skip((page - 1) * limit)
        .take(limit);

      queryBuilder.select([
        'payment.id',
        'payment.amount',
        'payment.status',
        'payment.createdAt',
        'payment.reviewedAt',
        'payment.codeOperation',
        'payment.banckName',
        'payment.dateOperation',
        'payment.numberTicket',
        'payment.rejectionReason',
        'payment.relatedEntityType',
        'payment.relatedEntityId',
        'paymentConfig.name',
        'reviewer.id',
        'reviewer.email',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.document',
        'user.email',
      ]);

      const [items, totalItems] = await queryBuilder.getManyAndCount();

      const enrichedItems = await this.enrichPaymentsWithRelatedEntities(items);

      const paginationResponse = PaginationHelper.createPaginatedResponse(
        enrichedItems,
        totalItems,
        filters,
      );

      return {
        ...paginationResponse,
        meta: {
          ...paginationResponse.meta,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async findOne(paymentId: number): Promise<PaymentAllResponse> {
    // Obtenemos el pago con todas las relaciones necesarias
    const payment = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.paymentConfig', 'paymentConfig')
      .leftJoinAndSelect('payment.reviewedBy', 'reviewer')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.details', 'details')
      .where('payment.id = :id', { id: paymentId })
      .select([
        'payment.id',
        'payment.amount',
        'payment.status',
        'payment.createdAt',
        'payment.reviewedAt',
        'payment.codeOperation',
        'payment.banckName',
        'payment.dateOperation',
        'payment.numberTicket',
        'payment.rejectionReason',
        'payment.relatedEntityType',
        'payment.relatedEntityId',
        'details',
        'paymentConfig.name',
        'reviewer.id',
        'reviewer.email',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.document',
        'user.email',
      ])
      .getOne();

    if (!payment) {
      throw new NotFoundException(`El pago con ID ${paymentId} no se encuentra registrado`);
    }
    const [enrichedPayment] = await this.enrichPaymentsWithRelatedEntities([payment]);
    
    const response: PaymentAllResponse = {
      ...enrichedPayment,
      vouchers: payment.details?.map(detail => ({
        id: detail.id,
        url: detail.url,
        amount: detail.amount,
        bankName: detail.bankName,
        transactionReference: detail.transactionReference,
        transactionDate: detail.transactionDate,
      })) || []
    };

    return response;
  }

  async updateDataOrcompletePayment(
    paymentId: number,
    reviewerId: string,
    completePaymentDto: CompletePaymentDto,
  ) {
    const { codeOperation, numberTicket } = completePaymentDto;
    if (!codeOperation && !numberTicket)
      throw new BadRequestException(
        'Se requiere al menos un código de operación o número de ticket',
      );
    
    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['user', 'paymentConfig', 'details'],
      });

      if (!payment) throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);

      if (payment.status !== StatusPayment.APPROVED)
        throw new BadRequestException(`El pago tiene que estar aprobado previamente`);

      payment.codeOperation = codeOperation || payment.codeOperation;
      payment.numberTicket = numberTicket || payment.numberTicket;

      if (payment.codeOperation && payment.numberTicket)
        payment.status = StatusPayment.COMPLETED;

      await queryRunner.manager.save(payment);
      return formatPaymentsResponse(payment);
    });
  }

  // Internal helpers methods
  private async enrichPaymentsWithRelatedEntities(payments: Payment[]): Promise<any[]> {
    return await Promise.all(
      payments.map(async (payment) => {
        const type = payment.relatedEntityType;
        const id = payment.relatedEntityId;

        if (!type || !id) return payment;

        const basePayment = {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.createdAt,
          reviewedAt: payment.reviewedAt,
          reviewBy: payment.reviewedBy,
          codeOperation: payment.codeOperation,
          banckName: payment.banckName,
          dateOperation: payment.dateOperation,
          numberTicket: payment.numberTicket,
          paymentConfig: payment.paymentConfig.name,
          reason: payment?.rejectionReason? payment.rejectionReason: null,
          user: payment.user
        };

        const getSaleData = async () => {
          switch (type) {
            case 'sale':
              return await this.salesService.findOneSaleWithPayments(id);
            case 'financing':
              return (await this.financingService.findOneWithPayments(id))?.sale;
            case 'financingInstallments':
              return (await this.financingInstallmentsService.findOneWithPayments(id));
            case 'reservation':
              return await this.reservationService.findOneWithPayments(id);
            default:
              return null;
          }
        };

        const sale = await getSaleData();
        console.log(sale);
        if (!sale) return basePayment;

        return {
          ...basePayment,
          currency: sale.lot.block?.stage?.project?.currency,
          client: sale.client && {
            address: sale.client.address,
            lead: {
              firstName: sale.client.lead?.firstName,
              lastName: sale.client.lead?.lastName,
              document: sale.client.lead?.document
            }
          },
          lot: sale.lot && {
            name: sale.lot.name,
            lotPrice: sale.lot.lotPrice,
            block: sale.lot.block?.name,
            stage: sale.lot.block?.stage?.name,
            project: sale.lot.block?.stage?.project?.name,
          }
        };
      })
    );
  }

  private async updateStatusSale(
    relatedEntityType: string,
    relatedEntityId: string,
    queryRunner: QueryRunner,
  ) {
    
      if (
        relatedEntityType === 'sale' && relatedEntityId)
        await this.salesService.updateStatusSale(
          relatedEntityId,
          StatusSale.PENDING_APPROVAL,
          queryRunner,
        );
      if (relatedEntityType === 'financing' && relatedEntityId) {
        const sale = await this.salesService.findOneByIdFinancing(relatedEntityId);
        await this.salesService.updateStatusSale(
          sale.id,
          StatusSale.PENDING_APPROVAL,
          queryRunner,
        );
      }
      if (relatedEntityType === 'reservation' && relatedEntityId) {
        await this.salesService.updateStatusSale(
          relatedEntityId,
          StatusSale.RESERVATION_PENDING_APPROVAL,
          queryRunner,
        );
      }
  }

  private isValidPaymentsItems(
    amount: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
  ): void {
    if (!files || files.length === 0)
      throw new BadRequestException('Se requiere al menos una imagen de comprobante de pago (voucher)');

    if (!paymentDetails || !Array.isArray(paymentDetails) || paymentDetails.length === 0)
      throw new BadRequestException('Se requieren detalles de pago');

    if (files.length !== paymentDetails.length)
      throw new BadRequestException(`El número de imágenes (${files.length}) no coincide con el número de detalles de pago (${paymentDetails.length}).`);

    const totalVoucherAmountSent = paymentDetails.reduce((sum, detail) => sum + detail.amount, 0);

    if (Math.abs(totalVoucherAmountSent - amount) > 0.01)
      throw new BadRequestException(
        `El monto total de los vouchers enviados (${totalVoucherAmountSent.toFixed(2)}) no coincide con el monto total del pago declarado (${amount.toFixed(2)}).`
      );
  }

  private async isValidPayment(
    paymentId: number,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'user.role', 'paymentConfig', 'details'],
    });

    if (!payment)
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado.`);

    if (payment.status !== StatusPayment.PENDING)
      throw new BadRequestException(
        `El pago con ID ${paymentId} no está en estado PENDIENTE y no puede ser aprobado. Estado actual: ${payment.status}.`,
      ); 
    
    if(payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
      const sale = await this.salesService.findOneById(payment.relatedEntityId);
      if (sale.type === SaleType.FINANCED)
        throw new BadRequestException(
          `El pago no puede ser aprobado porque esta venta está sujeta a un pago de financiación.`,
        );
    }
    
    if(payment.relatedEntityType === 'reservation' && payment.relatedEntityId) {
      const sale = await this.salesService.findOneById(payment.relatedEntityId);
      if (sale.status !== StatusSale.RESERVATION_PENDING_APPROVAL)
        throw new BadRequestException(
          `El pago de reserva no puede ser procesado porque la venta no está en estado de pago pendiente.`,
        );
    }
    
    return payment;
  }

  async isValidPaymentConfig(relatedEntityType: string, relatedEntityId: string) {
    let paymentConfig;
    let sale;
    if (relatedEntityType === 'sale') {
      sale = await this.salesService.findOneById(relatedEntityId);
      if (sale.status === StatusSale.PENDING_APPROVAL)
        throw new BadRequestException(`El pago porque tiene un pago pendiente en curso.`);
      paymentConfig = await this.paymentConfigService.findOneByCode('SALE_PAYMENT');
    }
    if (relatedEntityType === 'financing') {
      sale = await this.salesService.findOneByIdFinancing(relatedEntityId);
      if (sale.status === StatusSale.PENDING_APPROVAL)
        throw new BadRequestException(`El pago porque tiene un pago pendiente en curso.`);
      paymentConfig = await this.paymentConfigService.findOneByCode('FINANCING_PAYMENT');
    }
    if (relatedEntityType === 'financingInstallments'){
      paymentConfig = await this.paymentConfigService.findOneByCode('FINANCING_INSTALLMENTS_PAYMENT');
      const pendingPayment = await this.paymentRepository.findOne({
        where: { relatedEntityType, relatedEntityId, status: StatusPayment.PENDING },
      });
      if (pendingPayment)
        throw new BadRequestException(`El pago de cuotas no se puede realizar porque tiene un pago pendiente en curso.`);
    }
    
    if (relatedEntityType === 'reservation') {
      sale = await this.salesService.findOneById(relatedEntityId);
      if (sale.status !== StatusSale.RESERVATION_PENDING)
        throw new BadRequestException(`La reserva no está en estado pendiente de pago.`);
      if (sale.status === StatusSale.RESERVATION_PENDING_APPROVAL)
        throw new BadRequestException(`La reserva ya tiene un pago pendiente en curso.`);
      paymentConfig = await this.paymentConfigService.findOneByCode('RESERVATION_PAYMENT');
    }
    return paymentConfig;
  }

  async findPaymentsByRelatedEntity(relatedEntityType: string, relatedEntityId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: {
        relatedEntityType,
        relatedEntityId,
      },
      relations: ['paymentConfig'],
    });
  }

  async findPaymentsByRelatedEntities(relatedEntityType: string, relatedEntityIds: string[]): Promise<Payment[]> {
    if (!relatedEntityIds.length) return [];
    return this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.paymentConfig', 'paymentConfig')
      .where('payment.relatedEntityType = :type', { type: relatedEntityType })
      .andWhere('payment.relatedEntityId IN (:...ids)', { ids: relatedEntityIds })
      .getMany();
  }

  async updateStatusApprovedPayment(
    payment: Payment,
    queryRunner: QueryRunner,
  ) {
    let sale;
      if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
        sale = await this.salesService.findOneById(payment.relatedEntityId);
        if (sale.status !== StatusSale.PENDING_APPROVAL)
          throw new BadRequestException(`El pago no puede ser aprobado porque la venta no tiene aprobación de pago pendiente.`);
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.COMPLETED,
          queryRunner,
        );
      }
      if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
        sale = await this.salesService.findOneByIdFinancing(payment.relatedEntityId);
        if (sale.status !== StatusSale.PENDING_APPROVAL)
          throw new BadRequestException(`El pago no puede ser aprobado porque la venta no tiene aprobación de pago pendiente.`);
        await this.salesService.updateStatusSale(
          sale.id,
          StatusSale.IN_PAYMENT_PROCESS,
          queryRunner,
        );
      }
      if (payment.relatedEntityType === 'reservation' && payment.relatedEntityId) {
        sale = await this.salesService.findOneById(payment.relatedEntityId);
        if (sale.status !== StatusSale.RESERVATION_PENDING_APPROVAL)
          throw new BadRequestException(`El pago de reserva no puede ser aprobado porque no está pendiente de aprobación.`);
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.RESERVED,
          queryRunner,
        );
      }
  }
}
