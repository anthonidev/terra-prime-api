import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In, QueryRunner, Repository } from 'typeorm';
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
import { NexusApiService } from 'src/external-api/nexus-api.service';
import { PaymentNotificationAction } from 'src/external-api/dto/payment-approved-notification.dto';
import { envs } from 'src/config/envs';
import { CreatePaymentWithUrlDto } from '../dto/create-payment-with-url.dto';
import { BulkCreatePaymentsDto } from '../dto/bulk-create-payments.dto';
import { InvoicesService } from 'src/invoices/invoices.service';
import { FinancingInstallments } from 'src/admin-sales/financing/entities/financing-installments.entity';
import { StatusFinancingInstallments } from 'src/admin-sales/financing/enums/status-financing-installments.enum';
import { AddDetailToPaymentDto } from '../dto/add-detail-to-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentsDetailService: PaymentsDetailService,
    private readonly paymentConfigService: PaymentsConfigService,
    @Inject(forwardRef(() => SalesService))
    private readonly salesService: SalesService,
    private readonly transactionService: TransactionService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    @Inject(forwardRef(() => FinancingService))
    private readonly financingService: FinancingService,
    private readonly reservationService: ReservationsService,
    private readonly lotService: LotService,
    private readonly nexusApiService: NexusApiService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoicesService: InvoicesService,
  ) {}
  // Methods for endpoints
  async create(
    createPaymentDto: CreatePaymentDto,
    files: Express.Multer.File[],
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<PaymentResponse> {
    this.isValidPaymentsItems(
      createPaymentDto.amount,
      createPaymentDto.paymentDetails,
      files,
    );
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

      const paymentConfig = await this.isValidPaymentConfig(
        relatedEntityType,
        relatedEntityId,
      );
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
      await this.updateStatusSale(
        relatedEntityType,
        relatedEntityId,
        queryRunner,
      );
      const createdVouchers = await Promise.all(
        files.map(async (file, i) => {
          const currentPaymentDetailDto = paymentDetails.find(
            (detail) => detail.fileIndex === i,
          );
          if (!currentPaymentDetailDto)
            throw new BadRequestException(
              `No se encontró detalle de pago para el archivo en el índice ${i}.`,
            );
          const savedDetail = await this.paymentsDetailService.create(
            savedPayment.id,
            currentPaymentDetailDto,
            file,
            queryRunner,
          );
          uploadedKeys.push({
            detailId: savedDetail.id,
            urlKey: savedDetail.urlKey,
          });
          return {
            id: savedDetail.id,
            url: savedDetail.url,
            amount: savedDetail.amount,
            bankName: savedDetail.bankName,
            transactionReference: savedDetail.transactionReference,
            codeOperation: savedDetail.codeOperation,
            transactionDate: savedDetail.transactionDate,
            isActive: savedDetail.isActive,
          };
        }),
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
          console.error(
            `Error al eliminar detalle de pago ${detailId} y archivo S3 ${urlKey} durante el rollback: ${deleteErr.message}`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Agrega un voucher adicional a un payment existente de tipo cuotas o moras
   * y aplica SOLO el monto adicional a las cuotas/moras pendientes
   */
  async addDetailToPayment(
    paymentId: number,
    dto: AddDetailToPaymentDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<PaymentResponse> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'paymentConfig'],
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
    }

    if (
      payment.status === StatusPayment.REJECTED ||
      payment.status === StatusPayment.CANCELLED
    ) {
      throw new BadRequestException(
        'No se pueden agregar vouchers a pagos rechazados o anulados',
      );
    }

    if (
      payment.relatedEntityType !== 'financingInstallments' &&
      payment.relatedEntityType !== 'lateFee'
    ) {
      throw new BadRequestException(
        'Solo se pueden agregar vouchers a pagos de cuotas o moras',
      );
    }

    let uploadedDetail: { detailId: number; urlKey: string } | null = null;

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        try {
          const financingId = payment.relatedEntityId;

          if (payment.relatedEntityType === 'financingInstallments') {
            // Buscar cuotas PENDING/EXPIRED del financing
            const installmentsToPay = await queryRunner.manager.find(
              FinancingInstallments,
              {
                where: {
                  financing: { id: financingId },
                  status: In([
                    StatusFinancingInstallments.PENDING,
                    StatusFinancingInstallments.EXPIRED,
                  ]),
                },
                order: { expectedPaymentDate: 'ASC' },
              },
            );

            // Calcular total pendiente de cuotas (solo principal)
            const totalPendingAmount = parseFloat(
              installmentsToPay
                .reduce((sum, inst) => {
                  return (
                    sum +
                    parseFloat(Number(inst.coutePending ?? 0).toFixed(2))
                  );
                }, 0)
                .toFixed(2),
            );

            if (dto.amount > totalPendingAmount) {
              throw new BadRequestException(
                `El monto adicional (${dto.amount.toFixed(2)}) excede el pendiente de cuotas (${totalPendingAmount.toFixed(2)})`,
              );
            }

            // Crear el PaymentDetail con upload a S3
            const detailDto = {
              bankName: dto.bankName,
              transactionReference: dto.transactionReference,
              codeOperation: dto.codeOperation,
              transactionDate: dto.transactionDate,
              amount: dto.amount,
              fileIndex: 0,
            } as any;

            const savedDetail = await this.paymentsDetailService.create(
              payment.id,
              detailDto,
              file,
              queryRunner,
            );
            uploadedDetail = {
              detailId: savedDetail.id,
              urlKey: savedDetail.urlKey,
            };

            // Actualizar payment.amount
            payment.amount = Number(
              (Number(payment.amount) + dto.amount).toFixed(2),
            );

            // Aplicar SOLO el monto adicional a las cuotas
            const affectedDetails =
              await this.financingInstallmentsService.calculateAmountInCoutesWithDetails(
                installmentsToPay,
                dto.amount,
                queryRunner,
              );

            // Acumular metadata de cuotas afectadas
            const existingAffected =
              (payment.metadata?.['Cuotas afectadas'] as Record<
                string,
                any
              >) || {};

            for (const detail of affectedDetails) {
              const key = `Cuota ${detail.numberCuote ?? 'S/N'}`;
              if (existingAffected[key]) {
                existingAffected[key]['Monto aplicado'] = Number(
                  (
                    Number(existingAffected[key]['Monto aplicado'] || 0) +
                    detail.amountApplied
                  ).toFixed(2),
                );
                existingAffected[key]['Pendiente después de este pago'] =
                  detail.pendingAfterPayment;
                existingAffected[key]['Modo'] = detail.mode;
              } else {
                existingAffected[key] = {
                  Modo: detail.mode,
                  'Monto aplicado': detail.amountApplied,
                  'Pendiente después de este pago': detail.pendingAfterPayment,
                };
              }
            }

            payment.metadata = {
              ...payment.metadata,
              'Cuotas afectadas': existingAffected,
            };
          } else {
            // lateFee
            const installmentsWithLateFees =
              await this.financingInstallmentsService.getInstallmentsWithPendingLateFees(
                financingId,
              );

            const totalLateFeesPending = parseFloat(
              installmentsWithLateFees
                .reduce((sum, inst) => {
                  return sum + Number(inst.lateFeeAmountPending ?? 0);
                }, 0)
                .toFixed(2),
            );

            if (dto.amount > totalLateFeesPending) {
              throw new BadRequestException(
                `El monto adicional (${dto.amount.toFixed(2)}) excede el pendiente de moras (${totalLateFeesPending.toFixed(2)})`,
              );
            }

            // Crear el PaymentDetail con upload a S3
            const detailDto = {
              bankName: dto.bankName,
              transactionReference: dto.transactionReference,
              codeOperation: dto.codeOperation,
              transactionDate: dto.transactionDate,
              amount: dto.amount,
              fileIndex: 0,
            } as any;

            const savedDetail = await this.paymentsDetailService.create(
              payment.id,
              detailDto,
              file,
              queryRunner,
            );
            uploadedDetail = {
              detailId: savedDetail.id,
              urlKey: savedDetail.urlKey,
            };

            // Actualizar payment.amount
            payment.amount = Number(
              (Number(payment.amount) + dto.amount).toFixed(2),
            );

            // Aplicar SOLO el monto adicional a las moras
            const affectedDetails =
              await this.financingInstallmentsService.calculateLateFeePaymentWithDetails(
                installmentsWithLateFees,
                dto.amount,
                queryRunner,
              );

            // Acumular metadata de moras afectadas
            const existingAffected =
              (payment.metadata?.['Moras afectadas'] as Record<
                string,
                any
              >) || {};

            for (const detail of affectedDetails) {
              const key = `Cuota ${detail.numberCuote ?? 'S/N'}`;
              if (existingAffected[key]) {
                existingAffected[key]['Mora aplicada'] = Number(
                  (
                    Number(existingAffected[key]['Mora aplicada'] || 0) +
                    detail.amountApplied
                  ).toFixed(2),
                );
                existingAffected[key][
                  'Mora pendiente después de este pago'
                ] = detail.pendingAfterPayment;
                existingAffected[key]['Modo'] = detail.mode;
              } else {
                existingAffected[key] = {
                  Modo: detail.mode,
                  'Mora aplicada': detail.amountApplied,
                  'Mora pendiente después de este pago':
                    detail.pendingAfterPayment,
                };
              }
            }

            payment.metadata = {
              ...payment.metadata,
              'Moras afectadas': existingAffected,
            };
          }

          // Guardar payment actualizado
          const updatedPayment = await queryRunner.manager.save(payment);

          // Recargar details para la respuesta
          const freshPayment = await queryRunner.manager
            .getRepository(Payment)
            .findOne({
              where: { id: updatedPayment.id },
              relations: ['details'],
            });

          return {
            ...formatPaymentsResponse(updatedPayment),
            vouchers: (freshPayment?.details || []).map((detail) => ({
              id: detail.id,
              url: detail.url,
              amount: detail.amount,
              bankName: detail.bankName,
              transactionReference: detail.transactionReference,
              codeOperation: detail.codeOperation,
              transactionDate: detail.transactionDate,
              isActive: detail.isActive,
            })),
          };
        } catch (error) {
          // Rollback S3 si se subió un archivo
          if (uploadedDetail) {
            try {
              await this.paymentsDetailService.delete(
                uploadedDetail.urlKey,
                uploadedDetail.detailId,
              );
            } catch (deleteErr) {
              console.error(
                `Error al eliminar detalle de pago ${uploadedDetail.detailId} y archivo S3 ${uploadedDetail.urlKey} durante el rollback: ${deleteErr.message}`,
              );
            }
          }
          throw error;
        }
      },
    );
  }

  /**
   * Crea un pago auto-aprobado (para uso de ADM)
   * El pago se crea directamente con estado APPROVED
   */
  async createAutoApproved(
    createPaymentDto: CreatePaymentDto,
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket: string | undefined,
    queryRunner: QueryRunner,
    observation?: string,
  ): Promise<PaymentResponse> {
    this.isValidPaymentsItems(
      createPaymentDto.amount,
      createPaymentDto.paymentDetails,
      files,
    );
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

      const paymentConfig = await this.isValidPaymentConfig(
        relatedEntityType,
        relatedEntityId,
        true,
      );

      // Crear pago directamente como APPROVED
      const payment = this.paymentRepository.create({
        user: { id: userId },
        paymentConfig: { id: paymentConfig.id },
        amount: amount,
        status: StatusPayment.APPROVED,
        methodPayment: methodPayment,
        relatedEntityType: relatedEntityType,
        relatedEntityId: relatedEntityId,
        metadata: metadata || {},
        // Campos de aprobación
        reviewedBy: { id: userId } as any,
        reviewedAt: new Date(),
        dateOperation: new Date(dateOperation),
        numberTicket: numberTicket,
        observation: observation,
      });

      const savedPayment = await queryRunner.manager.save(payment);

      // Actualizar estado de la venta
      await this.updateStatusSale(
        relatedEntityType,
        relatedEntityId,
        queryRunner,
      );

      // Crear detalles de pago (vouchers)
      const createdVouchers = await Promise.all(
        files.map(async (file, i) => {
          const currentPaymentDetailDto = paymentDetails.find(
            (detail) => detail.fileIndex === i,
          );
          if (!currentPaymentDetailDto)
            throw new BadRequestException(
              `No se encontró detalle de pago para el archivo en el índice ${i}.`,
            );
          const savedDetail = await this.paymentsDetailService.create(
            savedPayment.id,
            currentPaymentDetailDto,
            file,
            queryRunner,
          );
          uploadedKeys.push({
            detailId: savedDetail.id,
            urlKey: savedDetail.urlKey,
          });
          return {
            id: savedDetail.id,
            url: savedDetail.url,
            amount: savedDetail.amount,
            bankName: savedDetail.bankName,
            transactionReference: savedDetail.transactionReference,
            codeOperation: savedDetail.codeOperation,
            transactionDate: savedDetail.transactionDate,
            isActive: savedDetail.isActive,
          };
        }),
      );

      // Actualizar estado al aprobar el pago
      savedPayment.details = createdVouchers as any;
      await this.updateStatusApprovedPayment(savedPayment, queryRunner, true);

      return {
        ...formatPaymentsResponse(savedPayment),
        vouchers: createdVouchers,
      };
    } catch (error) {
      for (const { detailId, urlKey } of uploadedKeys) {
        try {
          await this.paymentsDetailService.delete(urlKey, detailId);
        } catch (deleteErr) {
          console.error(
            `Error al eliminar detalle de pago ${detailId} y archivo S3 ${urlKey} durante el rollback: ${deleteErr.message}`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * MÉTODO PARA MIGRACIÓN DE DATOS
   * Crea un pago auto-aprobado usando URLs existentes (sin subir archivos)
   * El pago se crea directamente con estado APPROVED
   */
  async createAutoApprovedWithUrls(
    createPaymentDto: CreatePaymentWithUrlDto,
    queryRunner: QueryRunner,
  ): Promise<PaymentResponse> {
    try {
      const {
        amount,
        methodPayment,
        relatedEntityType,
        relatedEntityId,
        paymentDetails,
        metadata,
        userId,
        dateOperation,
        numberTicket,
      } = createPaymentDto;

      const paymentConfig = await this.isValidPaymentConfig(
        relatedEntityType,
        relatedEntityId,
        true,
      );

      // Crear pago directamente como APPROVED
      const payment = this.paymentRepository.create({
        user: { id: userId },
        paymentConfig: { id: paymentConfig.id },
        amount: amount,
        status: StatusPayment.APPROVED,
        methodPayment: methodPayment,
        relatedEntityType: relatedEntityType,
        relatedEntityId: relatedEntityId,
        metadata: metadata || {},
        // Campos de aprobación
        reviewedBy: { id: userId } as any,
        reviewedAt: new Date(),
        dateOperation: new Date(dateOperation),
        numberTicket: numberTicket,
      });

      const savedPayment = await queryRunner.manager.save(payment);

      // Actualizar estado de la venta
      await this.updateStatusSale(
        relatedEntityType,
        relatedEntityId,
        queryRunner,
      );

      // Crear detalles de pago usando URLs existentes
      const createdVouchers = await Promise.all(
        paymentDetails.map(async (detailDto) => {
          const savedDetail =
            await this.paymentsDetailService.createWithExistingUrl(
              savedPayment.id,
              detailDto,
              queryRunner,
            );
          return {
            id: savedDetail.id,
            url: savedDetail.url,
            amount: savedDetail.amount,
            bankName: savedDetail.bankName,
            transactionReference: savedDetail.transactionReference,
            codeOperation: savedDetail.codeOperation,
            transactionDate: savedDetail.transactionDate,
            isActive: savedDetail.isActive,
          };
        }),
      );

      // Actualizar estado al aprobar el pago (skip validación de estado para ADM)
      savedPayment.details = createdVouchers as any;
      await this.updateStatusApprovedPayment(savedPayment, queryRunner, true);

      return {
        ...formatPaymentsResponse(savedPayment),
        vouchers: createdVouchers,
      };
    } catch (error) {
      throw error;
    }
  }

  async approvePayment(
    paymentId: number,
    reviewedById: string,
    approvePaymentDto: ApprovePaymentDto,
  ): Promise<PaymentResponse> {
    const payment = await this.isValidPayment(paymentId);

    // ✅ Validar que todos los paymentDetails tengan codeOperation
    if (payment.details && payment.details.length > 0) {
      const detailsWithoutCode = payment.details.filter(
        (detail) => !detail.codeOperation || detail.codeOperation.trim() === '',
      );

      if (detailsWithoutCode.length > 0) {
        throw new BadRequestException(
          `No se puede aprobar el pago. ${detailsWithoutCode.length} detalle(s) de pago no tienen código de operación. Por favor, complete todos los códigos de operación antes de aprobar.`,
        );
      }
    }

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        payment.status = StatusPayment.APPROVED;
        payment.reviewedBy = { id: reviewedById } as any;
        payment.reviewedAt = new Date();
        // payment.banckName = approvePaymentDto.banckName;
        payment.dateOperation = new Date(approvePaymentDto.dateOperation);
        payment.numberTicket = approvePaymentDto.numberTicket;
        payment.metadata = {
          'Configuración de Pago': payment.paymentConfig.code,
          'Estado del Pago': StatusPayment.APPROVED,
          Monto: payment.amount,
          Descripción: `Pago aprobado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
        };
        const approvedPayment = await queryRunner.manager.save(payment);
        const statusResult = await this.updateStatusApprovedPayment(payment, queryRunner);

        // Notificar a Nexus si el pago fue registrado por el usuario externo
        if (statusResult && payment.user?.id === envs.externalUserId) {
          await this.notifyNexusPaymentStatusChange(
            payment,
            reviewedById,
            statusResult.newStatus,
            PaymentNotificationAction.APPROVED,
          );
        }

        return {
          ...formatPaymentsResponse(approvedPayment),
          vouchers: payment.details.map((detail) => ({
            id: detail.id,
            url: detail.url,
            amount: detail.amount,
            bankName: detail.bankName,
            transactionReference: detail.transactionReference,
            codeOperation: detail.codeOperation,
            transactionDate: detail.transactionDate,
            isActive: detail.isActive,
          })),
        };
      },
    );
  }

  async rejectPayment(
    paymentId: number,
    rejectionReason: string,
    reviewedById: string,
  ): Promise<PaymentResponse> {
    const payment = await this.isValidPayment(paymentId);
    const wasApproved = payment.status === StatusPayment.APPROVED;

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        payment.status = StatusPayment.REJECTED;
        payment.rejectionReason = rejectionReason;
        payment.reviewedBy = { id: reviewedById } as any;
        payment.reviewedAt = new Date();
        const canceledPayment = await queryRunner.manager.save(payment);

        let rejectedSaleId: string | null = null;
        let rejectedNewStatus: StatusSale | null = null;

        // ========== REVERTIR PAGO DE RESERVA ==========
        if (
          payment.relatedEntityType === 'reservation' &&
          payment.relatedEntityId
        ) {
          const sale = await this.salesService.findOneById(
            payment.relatedEntityId,
          );

          // Si el pago fue aprobado, revertir montos
          if (wasApproved) {
            const newPaid = Number(
              (
                Number(sale.reservationAmountPaid || 0) - Number(payment.amount)
              ).toFixed(2),
            );
            const newPending = Number(
              (Number(sale.reservationAmount) - newPaid).toFixed(2),
            );

            await queryRunner.manager.update(
              'sales',
              { id: sale.id },
              {
                reservationAmountPaid: newPaid > 0 ? newPaid : 0,
                reservationAmountPending:
                  newPending > 0 ? newPending : sale.reservationAmount,
              },
            );
          }

          // Determinar nuevo estado
          const updatedSale = await queryRunner.manager.findOne('sales', {
            where: { id: sale.id },
          } as any);
          let newStatus: StatusSale;
          if (Number(updatedSale.reservationAmountPaid || 0) === 0) {
            newStatus = StatusSale.RESERVATION_PENDING;
          } else {
            newStatus = StatusSale.RESERVATION_IN_PAYMENT;
          }

          await this.salesService.updateStatusSale(
            payment.relatedEntityId,
            newStatus,
            queryRunner,
          );
          rejectedSaleId = payment.relatedEntityId;
          rejectedNewStatus = newStatus;
        }

        // ========== REVERTIR PAGO DE VENTA COMPLETA ==========
        if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
          const sale = await this.salesService.findOneById(
            payment.relatedEntityId,
          );

          // Si el pago fue aprobado, revertir montos
          if (wasApproved) {
            const newPaid = Number(
              (
                Number(sale.totalAmountPaid || 0) - Number(payment.amount)
              ).toFixed(2),
            );
            const totalToPay = Number(
              (
                Number(sale.totalAmount) - Number(sale.reservationAmount || 0)
              ).toFixed(2),
            );
            const newPending = Number((totalToPay - newPaid).toFixed(2));

            await queryRunner.manager.update(
              'sales',
              { id: sale.id },
              {
                totalAmountPaid: newPaid > 0 ? newPaid : 0,
                totalAmountPending: newPending > 0 ? newPending : totalToPay,
              },
            );
          }

          // Determinar nuevo estado
          const updatedSale = await queryRunner.manager.findOne('sales', {
            where: { id: sale.id },
          } as any);
          let newStatus: StatusSale;
          if (Number(updatedSale.totalAmountPaid || 0) === 0) {
            newStatus = StatusSale.PENDING;
          } else {
            newStatus = StatusSale.IN_PAYMENT;
          }

          await this.salesService.updateStatusSale(
            payment.relatedEntityId,
            newStatus,
            queryRunner,
          );
          rejectedSaleId = payment.relatedEntityId;
          rejectedNewStatus = newStatus;
        }

        // ========== REVERTIR PAGO INICIAL DE FINANCIAMIENTO ==========
        if (
          payment.relatedEntityType === 'financing' &&
          payment.relatedEntityId
        ) {
          const sale = await this.salesService.findOneByIdFinancing(
            payment.relatedEntityId,
          );
          const financing = await queryRunner.manager.findOne('financing', {
            where: { id: payment.relatedEntityId },
          } as any);

          // Si el pago fue aprobado, revertir montos
          if (wasApproved && financing) {
            const newPaid = Number(
              (
                Number(financing.initialAmountPaid || 0) -
                Number(payment.amount)
              ).toFixed(2),
            );
            const initialToPay = Number(
              (
                Number(financing.initialAmount) -
                Number(sale.reservationAmount || 0)
              ).toFixed(2),
            );
            const newPending = Number((initialToPay - newPaid).toFixed(2));

            await queryRunner.manager.update(
              'financing',
              { id: financing.id },
              {
                initialAmountPaid: newPaid > 0 ? newPaid : 0,
                initialAmountPending:
                  newPending > 0 ? newPending : initialToPay,
              },
            );
          }

          // Determinar nuevo estado
          const updatedFinancing = await queryRunner.manager.findOne(
            'financing',
            {
              where: { id: payment.relatedEntityId },
            } as any,
          );
          let newStatus: StatusSale;
          if (Number(updatedFinancing.initialAmountPaid || 0) === 0) {
            newStatus = StatusSale.PENDING;
          } else {
            newStatus = StatusSale.IN_PAYMENT;
          }

          await this.salesService.updateStatusSale(
            sale.id,
            newStatus,
            queryRunner,
          );
          rejectedSaleId = sale.id;
          rejectedNewStatus = newStatus;
        }

        // ========== REVERTIR PAGOS DE CUOTAS ==========
        if (
          payment.relatedEntityType === 'financingInstallments' &&
          payment.relatedEntityId
        ) {
          await this.revertInstallmentsPayment(paymentId, queryRunner);
        }

        // Notificar a Nexus si el pago fue registrado por el usuario externo
        if (rejectedSaleId && rejectedNewStatus && payment.user?.id === envs.externalUserId) {
          await this.notifyNexusPaymentStatusChange(
            payment,
            reviewedById,
            rejectedNewStatus,
            PaymentNotificationAction.REJECTED,
          );
        }

        return {
          ...formatPaymentsResponse(canceledPayment),
          vouchers: payment.details.map((detail) => ({
            id: detail.id,
            url: detail.url,
            amount: detail.amount,
            bankName: detail.bankName,
            transactionReference: detail.transactionReference,
            codeOperation: detail.codeOperation,
            transactionDate: detail.transactionDate,
            isActive: detail.isActive,
          })),
        };
      },
    );
  }

  async revertInstallmentsPayment(
    paymentId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const payment = await queryRunner.manager.getRepository(Payment).findOne({
      where: { id: paymentId },
      relations: ['details'],
    });

    if (!payment) {
      throw new BadRequestException(
        'No se encontró el pago para revertir las cuotas',
      );
    }

    try {
      const financingId = payment.relatedEntityId;
      let remainingToRevert = Number(payment.amount);

      // Path A: Intentar revertir usando metadata "Cuotas afectadas"
      if (payment.metadata?.['Cuotas afectadas']) {
        const affectedInstallments = payment.metadata['Cuotas afectadas'];

        for (const [key, data] of Object.entries(affectedInstallments)) {
          if (remainingToRevert <= 0) break;

          const numberCuote = parseInt(key.replace('Cuota ', ''));
          const rawAmount =
            (data as any)['Monto aplicado'] ??
            (data as any)['Aplicado a cuota'];

          if (rawAmount === undefined || rawAmount === null) continue;

          const amountApplied = Number(rawAmount);

          const installment = await queryRunner.manager.findOne(
            FinancingInstallments,
            {
              where: {
                financing: { id: financingId },
                numberCuote: numberCuote,
              },
            },
          );

          if (!installment) continue;

          // Revertir principal
          const principalToRevert = Math.min(
            amountApplied,
            Number(installment.coutePaid || 0),
          );

          if (principalToRevert > 0) {
            installment.coutePaid = Number(
              (Number(installment.coutePaid) - principalToRevert).toFixed(2),
            );
            installment.coutePending = Number(
              (Number(installment.coutePending) + principalToRevert).toFixed(2),
            );
            remainingToRevert = Number(
              (remainingToRevert - principalToRevert).toFixed(2),
            );
          }

          // Recalcular status
          this.recalculateInstallmentStatus(installment);
          await queryRunner.manager.save(installment);
        }
      }

      // Path B (fallback): Si queda monto por revertir, buscar cuotas de atrás hacia adelante
      if (remainingToRevert > 0) {
        const installments = await queryRunner.manager.find(
          FinancingInstallments,
          {
            where: {
              financing: { id: financingId },
            },
            order: { expectedPaymentDate: 'DESC' },
          },
        );

        for (const installment of installments) {
          if (remainingToRevert <= 0) break;
          if (Number(installment.coutePaid || 0) <= 0) continue;

          const principalToRevert = Math.min(
            remainingToRevert,
            Number(installment.coutePaid),
          );

          if (principalToRevert > 0) {
            installment.coutePaid = Number(
              (Number(installment.coutePaid) - principalToRevert).toFixed(2),
            );
            installment.coutePending = Number(
              (Number(installment.coutePending) + principalToRevert).toFixed(2),
            );
            remainingToRevert = Number(
              (remainingToRevert - principalToRevert).toFixed(2),
            );
          }

          // Recalcular status
          this.recalculateInstallmentStatus(installment);
          await queryRunner.manager.save(installment);
        }
      }
    } catch (error) {
      throw new BadRequestException(
        'Error al revertir las cuotas: ' + error.message,
      );
    }
  }

  private async revertLateFeePayment(
    paymentId: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const payment = await queryRunner.manager.getRepository(Payment).findOne({
      where: { id: paymentId },
      relations: ['details'],
    });

    if (!payment) {
      throw new BadRequestException(
        'No se encontró el pago para revertir las moras',
      );
    }

    try {
      const financingId = payment.relatedEntityId;
      let remainingToRevert = Number(payment.amount);

      // Path A: Intentar revertir usando metadata "Moras afectadas"
      if (payment.metadata?.['Moras afectadas']) {
        const affectedInstallments = payment.metadata['Moras afectadas'];

        for (const [key, data] of Object.entries(affectedInstallments)) {
          if (remainingToRevert <= 0) break;

          const numberCuote = parseInt(key.replace('Cuota ', ''));
          const rawAmount = (data as any)['Mora aplicada'];

          if (rawAmount === undefined || rawAmount === null) continue;

          const amountApplied = Number(rawAmount);

          const installment = await queryRunner.manager.findOne(
            FinancingInstallments,
            {
              where: {
                financing: { id: financingId },
                numberCuote: numberCuote,
              },
            },
          );

          if (!installment) continue;

          const lateFeeToRevert = Math.min(
            amountApplied,
            Number(installment.lateFeeAmountPaid || 0),
          );

          if (lateFeeToRevert > 0) {
            installment.lateFeeAmountPaid = Number(
              (Number(installment.lateFeeAmountPaid) - lateFeeToRevert).toFixed(2),
            );
            installment.lateFeeAmountPending = Number(
              (Number(installment.lateFeeAmountPending) + lateFeeToRevert).toFixed(2),
            );
            remainingToRevert = Number(
              (remainingToRevert - lateFeeToRevert).toFixed(2),
            );
          }

          // Recalcular status
          this.recalculateInstallmentStatus(installment);
          await queryRunner.manager.save(installment);
        }
      }

      // Path B (fallback): Si queda monto por revertir, buscar cuotas de atrás hacia adelante
      if (remainingToRevert > 0) {
        const installments = await queryRunner.manager.find(
          FinancingInstallments,
          {
            where: {
              financing: { id: financingId },
            },
            order: { expectedPaymentDate: 'DESC' },
          },
        );

        for (const installment of installments) {
          if (remainingToRevert <= 0) break;
          if (Number(installment.lateFeeAmountPaid || 0) <= 0) continue;

          const lateFeeToRevert = Math.min(
            remainingToRevert,
            Number(installment.lateFeeAmountPaid),
          );

          if (lateFeeToRevert > 0) {
            installment.lateFeeAmountPaid = Number(
              (Number(installment.lateFeeAmountPaid) - lateFeeToRevert).toFixed(2),
            );
            installment.lateFeeAmountPending = Number(
              (Number(installment.lateFeeAmountPending) + lateFeeToRevert).toFixed(2),
            );
            remainingToRevert = Number(
              (remainingToRevert - lateFeeToRevert).toFixed(2),
            );
          }

          // Recalcular status
          this.recalculateInstallmentStatus(installment);
          await queryRunner.manager.save(installment);
        }
      }
    } catch (error) {
      throw new BadRequestException(
        'Error al revertir las moras: ' + error.message,
      );
    }
  }

  private recalculateInstallmentStatus(
    installment: FinancingInstallments,
  ): void {
    const hasPrincipalPending = Number(installment.coutePending ?? 0) > 0;
    const hasLateFeePending =
      Number(installment.lateFeeAmountPending ?? 0) > 0;

    if (hasLateFeePending) {
      installment.status = StatusFinancingInstallments.EXPIRED;
    } else if (hasPrincipalPending) {
      const now = new Date();
      const expectedDate = new Date(installment.expectedPaymentDate);
      installment.status =
        expectedDate < now
          ? StatusFinancingInstallments.EXPIRED
          : StatusFinancingInstallments.PENDING;
    } else {
      installment.status = StatusFinancingInstallments.PAID;
    }
  }

  private async revertFinancingInitialPayment(
    payment: Payment,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const sale = await this.salesService.findOneByIdFinancing(
      payment.relatedEntityId,
    );

    const financing = await queryRunner.manager.findOne('financing', {
      where: { id: payment.relatedEntityId },
    } as any);

    if (!financing)
      throw new BadRequestException(
        `No se encontró el financiamiento con ID ${payment.relatedEntityId}`,
      );

    // Revertir montos de cuota inicial
    const newPaid = Number(
      (
        Number(financing.initialAmountPaid || 0) - Number(payment.amount)
      ).toFixed(2),
    );
    const initialToPay = Number(
      (
        Number(financing.initialAmount) -
        Number(sale.reservationAmount || 0)
      ).toFixed(2),
    );
    const newPending = Number((initialToPay - newPaid).toFixed(2));

    await queryRunner.manager.update(
      'financing',
      { id: financing.id },
      {
        initialAmountPaid: newPaid > 0 ? newPaid : 0,
        initialAmountPending: newPending > 0 ? newPending : initialToPay,
      },
    );

    // Determinar nuevo estado de la venta
    const updatedFinancing = await queryRunner.manager.findOne('financing', {
      where: { id: payment.relatedEntityId },
    } as any);

    let newStatus: StatusSale;
    if (Number(updatedFinancing.initialAmountPaid || 0) === 0) {
      newStatus = StatusSale.PENDING;
    } else {
      newStatus = StatusSale.IN_PAYMENT;
    }

    await this.salesService.updateStatusSale(sale.id, newStatus, queryRunner);
  }

  private async revertReservationPayment(
    payment: Payment,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const sale = await this.salesService.findOneById(payment.relatedEntityId);

    // Revertir montos de reserva
    const newPaid = Number(
      (
        Number(sale.reservationAmountPaid || 0) - Number(payment.amount)
      ).toFixed(2),
    );
    const newPending = Number(
      (Number(sale.reservationAmount) - newPaid).toFixed(2),
    );

    await queryRunner.manager.update(
      'sales',
      { id: sale.id },
      {
        reservationAmountPaid: newPaid > 0 ? newPaid : 0,
        reservationAmountPending:
          newPending > 0 ? newPending : sale.reservationAmount,
      },
    );

    // Determinar nuevo estado de la venta
    const updatedSale = await queryRunner.manager.findOne('sales', {
      where: { id: sale.id },
    } as any);

    let newStatus: StatusSale;
    if (Number(updatedSale.reservationAmountPaid || 0) === 0) {
      newStatus = StatusSale.RESERVATION_PENDING;
    } else {
      newStatus = StatusSale.RESERVATION_IN_PAYMENT;
    }

    await this.salesService.updateStatusSale(
      payment.relatedEntityId,
      newStatus,
      queryRunner,
    );
  }

  /**
   * Anula un pago de cuotas, cuota inicial o reserva que ya fue aprobado
   * Revierte todos los montos afectados
   */
  async cancelInstallmentPayment(
    paymentId: number,
    cancellationReason: string,
    canceledById: string,
  ): Promise<PaymentResponse> {
    // Buscar el pago con sus relaciones
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'user.role', 'paymentConfig', 'details'],
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
    }

    // Validar que sea un pago de cuotas, cuota inicial, reserva o moras
    const allowedTypes = ['financingInstallments', 'financing', 'reservation', 'lateFee'];
    if (!allowedTypes.includes(payment.relatedEntityType)) {
      throw new BadRequestException(
        'Solo se pueden anular pagos de cuotas, cuota inicial, reserva o moras',
      );
    }

    // Validar que el pago esté aprobado o completado
    if (
      payment.status !== StatusPayment.APPROVED &&
      payment.status !== StatusPayment.COMPLETED
    ) {
      throw new BadRequestException(
        `Solo se pueden anular pagos en estado APPROVED o COMPLETED. Estado actual: ${payment.status}`,
      );
    }

    // Ejecutar la anulación en una transacción
    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        // Cambiar estado a CANCELLED
        payment.status = StatusPayment.CANCELLED;
        payment.rejectionReason = cancellationReason;
        payment.reviewedBy = { id: canceledById } as any;
        payment.reviewedAt = new Date();

        // Agregar metadata de cancelación
        payment.metadata = {
          ...payment.metadata,
          canceledAt: new Date().toISOString(),
          canceledBy: canceledById,
          cancellationReason: cancellationReason,
        };

        const canceledPayment = await queryRunner.manager.save(payment);

        // Revertir según tipo de pago
        if (payment.relatedEntityType === 'financingInstallments') {
          await this.revertInstallmentsPayment(paymentId, queryRunner);
        }

        if (payment.relatedEntityType === 'financing') {
          await this.revertFinancingInitialPayment(payment, queryRunner);
        }

        if (payment.relatedEntityType === 'reservation') {
          await this.revertReservationPayment(payment, queryRunner);
        }

        if (payment.relatedEntityType === 'lateFee') {
          await this.revertLateFeePayment(paymentId, queryRunner);
        }

        // Anular factura asociada si existe
        const annulledInvoice =
          await this.invoicesService.annulInvoiceByPaymentId(
            paymentId,
            `Anulación automática por cancelación de pago: ${cancellationReason}`,
          );

        if (annulledInvoice) {
          console.log(
            `✅ Factura ${annulledInvoice.id} anulada exitosamente en Nubefact`,
          );
        }

        return {
          ...formatPaymentsResponse(canceledPayment),
          vouchers: payment.details.map((detail) => ({
            id: detail.id,
            url: detail.url,
            amount: detail.amount,
            bankName: detail.bankName,
            transactionReference: detail.transactionReference,
            codeOperation: detail.codeOperation,
            transactionDate: detail.transactionDate,
            isActive: detail.isActive,
          })),
        };
      },
    );
  }

  async findAllPayments(
    filters: FindPaymentsDto,
    userId?: string,
  ): Promise<Paginated<PaymentAllResponse>> {
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
        orderBy = 'createdAt',
        search,
      } = filters;

      const queryBuilder = this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.paymentConfig', 'paymentConfig')
        .leftJoinAndSelect('payment.reviewedBy', 'reviewer')
        .leftJoinAndSelect('payment.user', 'user')
        // Join para pagos de tipo 'sale' y 'reservation'
        .leftJoin(
          'sales',
          'sale',
          `sale.id = "payment"."relatedEntityId"::uuid AND "payment"."relatedEntityType" IN ('sale', 'reservation')`,
        )
        .leftJoin('sale.client', 'client')
        .leftJoin('client.lead', 'lead')
        // Join para pagos de tipo 'financing' y 'financingInstallments'
        .leftJoin(
          'financing',
          'financing',
          `financing.id = "payment"."relatedEntityId"::uuid AND "payment"."relatedEntityType" IN ('financing', 'financingInstallments', 'lateFee')`,
        )
        .leftJoin('financing.sale', 'financingSale')
        .leftJoin('financingSale.client', 'financingClient')
        .leftJoin('financingClient.lead', 'financingLead');

      if (paymentConfigId)
        queryBuilder.andWhere('payment.paymentConfig.id = :paymentConfigId', {
          paymentConfigId,
        });

      if (status) queryBuilder.andWhere('payment.status = :status', { status });

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
          '(user.email ILIKE :search OR payment.numberTicket ILIKE :search OR lead.document ILIKE :search OR financingLead.document ILIKE :search)',
          {
            search: `%${search}%`,
          },
        );

      if (userId)
        queryBuilder.andWhere('payment.user.id = :userId', { userId });

      if (collectorId)
        queryBuilder.andWhere('payment.user.id = :collectorId', {
          collectorId,
        });

      queryBuilder
        .orderBy(`payment.${orderBy}`, order)
        .skip((page - 1) * limit)
        .take(limit);

      queryBuilder.select([
        'payment.id',
        'payment.amount',
        'payment.status',
        'payment.createdAt',
        'payment.reviewedAt',
        'payment.banckName',
        'payment.dateOperation',
        'payment.numberTicket',
        'payment.rejectionReason',
        'payment.relatedEntityType',
        'payment.relatedEntityId',
        'paymentConfig.id',
        'paymentConfig.code',
        'paymentConfig.name',
        'paymentConfig.description',
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
        'payment.banckName',
        'payment.dateOperation',
        'payment.numberTicket',
        'payment.observation',
        'payment.rejectionReason',
        'payment.relatedEntityType',
        'payment.relatedEntityId',
        'details',
        'paymentConfig.id',
        'paymentConfig.code',
        'paymentConfig.name',
        'paymentConfig.description',
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
      throw new NotFoundException(
        `El pago con ID ${paymentId} no se encuentra registrado`,
      );
    }
    const [enrichedPayment] = await this.enrichPaymentsWithRelatedEntities([
      payment,
    ]);

    const response: PaymentAllResponse = {
      ...enrichedPayment,
      vouchers:
        payment.details?.map((detail) => ({
          id: detail.id,
          url: detail.url,
          amount: detail.amount,
          bankName: detail.bankName,
          transactionReference: detail.transactionReference,
          codeOperation: detail.codeOperation,
          transactionDate: detail.transactionDate,
          isActive: detail.isActive,
        })) || [],
    };

    return response;
  }

  async updateDataOrcompletePayment(
    paymentId: number,
    reviewerId: string,
    completePaymentDto: CompletePaymentDto,
  ) {
    const { numberTicket, observation, dateOperation } = completePaymentDto;
    if (!numberTicket)
      throw new BadRequestException('Se requiere el número de ticket');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        const payment = await this.paymentRepository.findOne({
          where: { id: paymentId },
          relations: ['user', 'paymentConfig', 'details'],
        });

        if (!payment)
          throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);

        // if (payment.status !== StatusPayment.APPROVED)
        //   throw new BadRequestException(
        //     `El pago tiene que estar aprobado previamente`,
        //   );

        payment.numberTicket = numberTicket;
        payment.status = StatusPayment.COMPLETED;

        if (observation !== undefined) {
          payment.observation = observation;
        }

        if (dateOperation) {
          payment.dateOperation = new Date(dateOperation);
        }

        await queryRunner.manager.save(payment);
        return formatPaymentsResponse(payment);
      },
    );
  }

  /**
   * MÉTODO HELPER PARA MIGRACIÓN
   * Resuelve el financingId actual usando el saleCode de la migración
   */
  private async resolveFinancingIdFromSaleCode(
    saleCode: string,
  ): Promise<string> {
    const sale = await this.paymentRepository.manager
      .createQueryBuilder('sales', 'sale')
      .leftJoinAndSelect('sale.financing', 'financing')
      .where("sale.metadata->>'Codigo' = :saleCode", { saleCode })
      .getOne();

    if (!sale) {
      throw new NotFoundException(
        `No se encontró una venta con código ${saleCode}`,
      );
    }

    if (!sale['financing']) {
      throw new NotFoundException(
        `La venta con código ${saleCode} no tiene un financiamiento asociado`,
      );
    }

    return sale['financing'].id;
  }

  /**
   * MÉTODO TEMPORAL PARA MIGRACIÓN DE DATOS
   * Crea múltiples payments en bulk usando URLs existentes (sin subir archivos)
   * Todos los payments se crean directamente como APPROVED
   * Para financingInstallments, sigue la lógica completa de actualización de cuotas
   * Resuelve el financingId usando el saleCode de la migración
   */
  async bulkCreatePaymentsWithUrls(
    bulkDto: BulkCreatePaymentsDto,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const paymentDto of bulkDto.payments) {
      try {
        // Resolver el financingId desde el saleCode
        let financingId: string;

        if (paymentDto.saleCode) {
          this.logger.log(
            `Resolviendo financingId para saleCode: ${paymentDto.saleCode}`,
          );
          financingId = await this.resolveFinancingIdFromSaleCode(
            paymentDto.saleCode,
          );
          this.logger.log(
            `FinancingId resuelto: ${financingId} para saleCode: ${paymentDto.saleCode}`,
          );
        } else if (paymentDto.relatedEntityId) {
          // Fallback por si viene con relatedEntityId
          financingId = paymentDto.relatedEntityId;
        } else {
          throw new BadRequestException(
            'Se requiere saleCode o relatedEntityId para crear el payment',
          );
        }

        // Si es un pago de cuotas de financiamiento, usar la lógica específica
        if (paymentDto.relatedEntityType === 'financingInstallments') {
          await this.financingInstallmentsService.payInstallmentsAutoApprovedWithUrls(
            financingId,
            paymentDto.amount,
            paymentDto.paymentDetails,
            paymentDto.userId,
            paymentDto.dateOperation,
            paymentDto.numberTicket,
          );

          results.success++;
          this.logger.log(
            `✓ Financing installment payment created successfully for saleCode ${paymentDto.saleCode} (financing ${financingId})`,
          );
        } else {
          // Para otros tipos de pagos, usar el método directo
          await this.transactionService.runInTransaction(
            async (queryRunner) => {
              // Asignar el financingId resuelto
              paymentDto.relatedEntityId = financingId;

              await this.createAutoApprovedWithUrls(paymentDto, queryRunner);

              results.success++;
              this.logger.log(
                `✓ Payment created successfully for ${paymentDto.relatedEntityType} ${financingId}`,
              );
            },
          );
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          saleCode: paymentDto.saleCode,
          relatedEntityType: paymentDto.relatedEntityType,
          amount: paymentDto.amount,
          error: error.message,
        });
        this.logger.error(
          `✗ Failed to create payment for saleCode ${paymentDto.saleCode}: ${error.message}`,
        );
      }
    }

    return results;
  }

  // Internal helpers methods
  private async enrichPaymentsWithRelatedEntities(
    payments: Payment[],
  ): Promise<any[]> {
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
          banckName: payment.banckName,
          dateOperation: payment.dateOperation,
          numberTicket: payment.numberTicket,
          observation: payment.observation,
          paymentConfig: {
            code: payment.paymentConfig.code,
            name: payment.paymentConfig.name,
            description: payment.paymentConfig.description,
          },
          reason: payment?.rejectionReason ? payment.rejectionReason : null,
          user: payment.user,
        };

        const getSaleData = async () => {
          switch (type) {
            case 'sale':
              return await this.salesService.findOneSaleWithPayments(id);
            case 'financing':
              return (await this.financingService.findOneWithPayments(id))
                ?.sale;
            case 'financingInstallments':
              return await this.financingInstallmentsService.findOneWithPayments(
                id,
              );
            case 'lateFee':
              return (await this.financingService.findOneWithPayments(id))
                ?.sale;
            case 'reservation':
              return await this.salesService.findOneSaleWithPayments(id);
            default:
              return null;
          }
        };

        const sale = await getSaleData();
        if (!sale) return basePayment;

        return {
          ...basePayment,
          currency: sale.lot.block?.stage?.project?.currency,
          client: sale.client
            ? {
                address: sale.client.address,
                documentType: sale.client.lead?.documentType,
                email: sale.client.lead?.email,
                lead: {
                  firstName: sale.client.lead?.firstName,
                  lastName: sale.client.lead?.lastName,
                  document: sale.client.lead?.document,
                },
              }
            : null,

          lot: sale.lot
            ? {
                name: sale.lot.name,
                lotPrice: sale.lot.lotPrice,
                block: sale.lot.block?.name,
                stage: sale.lot.block?.stage?.name,
                project: sale.lot.block?.stage?.project?.name,
              }
            : null,
        };
      }),
    );
  }

  private async updateStatusSale(
    relatedEntityType: string,
    relatedEntityId: string,
    queryRunner: QueryRunner,
  ) {
    if (relatedEntityType === 'sale' && relatedEntityId)
      await this.salesService.updateStatusSale(
        relatedEntityId,
        StatusSale.PENDING_APPROVAL,
        queryRunner,
      );
    if (relatedEntityType === 'financing' && relatedEntityId) {
      const sale =
        await this.salesService.findOneByIdFinancing(relatedEntityId);
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
      throw new BadRequestException(
        'Se requiere al menos una imagen de comprobante de pago (voucher)',
      );

    if (
      !paymentDetails ||
      !Array.isArray(paymentDetails) ||
      paymentDetails.length === 0
    )
      throw new BadRequestException('Se requieren detalles de pago');

    if (files.length !== paymentDetails.length)
      throw new BadRequestException(
        `El número de imágenes (${files.length}) no coincide con el número de detalles de pago (${paymentDetails.length}).`,
      );

    const totalVoucherAmountSent = paymentDetails.reduce(
      (sum, detail) => sum + detail.amount,
      0,
    );

    if (Math.abs(totalVoucherAmountSent - amount) > 0.01)
      throw new BadRequestException(
        `El monto total de los vouchers enviados (${totalVoucherAmountSent.toFixed(2)}) no coincide con el monto total del pago declarado (${amount.toFixed(2)}).`,
      );
  }

  private async isValidPayment(paymentId: number): Promise<Payment> {
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

    if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
      const sale = await this.salesService.findOneById(payment.relatedEntityId);
      if (sale.type === SaleType.FINANCED)
        throw new BadRequestException(
          `El pago no puede ser aprobado porque esta venta está sujeta a un pago de financiación.`,
        );
    }

    if (
      payment.relatedEntityType === 'reservation' &&
      payment.relatedEntityId
    ) {
      const sale = await this.salesService.findOneById(payment.relatedEntityId);
      if (sale.status !== StatusSale.RESERVATION_PENDING_APPROVAL)
        throw new BadRequestException(
          `El pago de reserva no puede ser procesado porque la venta no está en estado de pago pendiente.`,
        );
    }

    return payment;
  }

  async isValidPaymentConfig(
    relatedEntityType: string,
    relatedEntityId: string,
    isAutoApproved = false,
  ) {
    let paymentConfig;
    let sale;
    if (relatedEntityType === 'sale') {
      sale = await this.salesService.findOneById(relatedEntityId);
      if (!isAutoApproved && sale.status === StatusSale.PENDING_APPROVAL)
        throw new BadRequestException(
          `El pago porque tiene un pago pendiente en curso.`,
        );
      paymentConfig =
        await this.paymentConfigService.findOneByCode('SALE_PAYMENT');
    }
    if (relatedEntityType === 'financing') {
      sale = await this.salesService.findOneByIdFinancing(relatedEntityId);
      if (!isAutoApproved && sale.status === StatusSale.PENDING_APPROVAL)
        throw new BadRequestException(
          `El pago porque tiene un pago pendiente en curso.`,
        );
      paymentConfig =
        await this.paymentConfigService.findOneByCode('FINANCING_PAYMENT');
    }
    if (relatedEntityType === 'financingInstallments') {
      paymentConfig = await this.paymentConfigService.findOneByCode(
        'FINANCING_INSTALLMENTS_PAYMENT',
      );
      if (!isAutoApproved) {
        const pendingPayment = await this.paymentRepository.findOne({
          where: {
            relatedEntityType,
            relatedEntityId,
            status: StatusPayment.PENDING,
          },
        });
        if (pendingPayment)
          throw new BadRequestException(
            `El pago de cuotas no se puede realizar porque tiene un pago pendiente en curso.`,
          );
      }
    }

    if (relatedEntityType === 'reservation') {
      sale = await this.salesService.findOneById(relatedEntityId);
      if (!isAutoApproved) {
        if (sale.status === StatusSale.RESERVATION_PENDING_APPROVAL)
          throw new BadRequestException(
            `La reserva ya tiene un pago pendiente de aprobación.`,
          );
        if (
          sale.status !== StatusSale.RESERVATION_PENDING &&
          sale.status !== StatusSale.RESERVATION_IN_PAYMENT
        )
          throw new BadRequestException(
            `La reserva no está en estado pendiente de pago.`,
          );
      }
      paymentConfig = await this.paymentConfigService.findOneByCode(
        'RESERVATION_PAYMENT',
      );
    }

    if (relatedEntityType === 'lateFee') {
      paymentConfig =
        await this.paymentConfigService.findOneByCode('LATE_FEE_PAYMENT');
      if (!isAutoApproved) {
        const pendingPayment = await this.paymentRepository.findOne({
          where: {
            relatedEntityType,
            relatedEntityId,
            status: StatusPayment.PENDING,
          },
        });
        if (pendingPayment)
          throw new BadRequestException(
            `El pago de moras no se puede realizar porque tiene un pago pendiente en curso.`,
          );
      }
    }

    return paymentConfig;
  }

  async findPaymentsByRelatedEntity(
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: {
        relatedEntityType,
        relatedEntityId,
      },
      relations: ['paymentConfig'],
    });
  }

  async findPaymentsByRelatedEntities(
    relatedEntityType: string,
    relatedEntityIds: string[],
  ): Promise<Payment[]> {
    if (!relatedEntityIds.length) return [];
    return this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.paymentConfig', 'paymentConfig')
      .where('payment.relatedEntityType = :type', { type: relatedEntityType })
      .andWhere('payment.relatedEntityId IN (:...ids)', {
        ids: relatedEntityIds,
      })
      .getMany();
  }

  async updateStatusApprovedPayment(
    payment: Payment,
    queryRunner: QueryRunner,
    skipStatusValidation = false,
  ): Promise<{ saleId: string; newStatus: StatusSale } | null> {
    let sale;

    // ========== PAGO DE RESERVA ==========
    if (
      payment.relatedEntityType === 'reservation' &&
      payment.relatedEntityId
    ) {
      sale = await this.salesService.findOneById(payment.relatedEntityId);

      // Validar estado
      if (
        !skipStatusValidation &&
        sale.status !== StatusSale.RESERVATION_PENDING_APPROVAL &&
        sale.status !== StatusSale.RESERVATION_IN_PAYMENT
      )
        throw new BadRequestException(
          `El pago de reserva no puede ser aprobado porque no está pendiente de aprobación.`,
        );

      // Actualizar montos
      const newPaid = Number(
        (
          Number(sale.reservationAmountPaid || 0) + Number(payment.amount)
        ).toFixed(2),
      );
      const newPending = Number(
        (Number(sale.reservationAmount) - newPaid).toFixed(2),
      );

      await queryRunner.manager.update(
        'sales',
        { id: sale.id },
        {
          reservationAmountPaid: newPaid,
          reservationAmountPending: newPending > 0 ? newPending : 0,
        },
      );

      // Si la venta tiene financiamiento, reflejar el pago de reserva en initialAmountPaid
      if (sale.financing) {
        const newInitialPaid = Number(
          (
            Number(sale.financing.initialAmountPaid || 0) +
            Number(payment.amount)
          ).toFixed(2),
        );
        await queryRunner.manager.update(
          'financing',
          { id: sale.financing.id },
          {
            initialAmountPaid: newInitialPaid,
          },
        );
      }

      // Determinar nuevo estado
      let newStatus: StatusSale;
      if (newPending <= 0) {
        // Completamente pagado
        newStatus = StatusSale.RESERVED;
      } else {
        // Pago parcial
        newStatus = StatusSale.RESERVATION_IN_PAYMENT;
      }

      await this.salesService.updateStatusSale(
        payment.relatedEntityId,
        newStatus,
        queryRunner,
      );

      return { saleId: payment.relatedEntityId, newStatus };
    }

    // ========== PAGO DE VENTA COMPLETA (DIRECT PAYMENT) ==========
    if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
      sale = await this.salesService.findOneById(payment.relatedEntityId);

      // Validar estado
      if (
        !skipStatusValidation &&
        sale.status !== StatusSale.PENDING_APPROVAL &&
        sale.status !== StatusSale.IN_PAYMENT
      )
        throw new BadRequestException(
          `El pago no puede ser aprobado porque la venta no tiene aprobación de pago pendiente.`,
        );

      // Calcular monto total a pagar (totalAmount - reservationAmount si existe)
      const totalToPay = Number(
        (
          Number(sale.totalAmount) - Number(sale.reservationAmount || 0)
        ).toFixed(2),
      );

      // Actualizar montos
      const newPaid = Number(
        (Number(sale.totalAmountPaid || 0) + Number(payment.amount)).toFixed(2),
      );
      const newPending = Number((totalToPay - newPaid).toFixed(2));

      await queryRunner.manager.update(
        'sales',
        { id: sale.id },
        {
          totalAmountPaid: newPaid,
          totalAmountPending: newPending > 0 ? newPending : 0,
        },
      );

      // Determinar nuevo estado
      let newStatus: StatusSale;
      if (newPending <= 0) {
        // Completamente pagado
        newStatus = StatusSale.COMPLETED;
      } else {
        // Pago parcial
        newStatus = StatusSale.IN_PAYMENT;
      }

      await this.salesService.updateStatusSale(
        payment.relatedEntityId,
        newStatus,
        queryRunner,
      );

      return { saleId: payment.relatedEntityId, newStatus };
    }

    // ========== PAGO INICIAL DE FINANCIAMIENTO ==========
    if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
      sale = await this.salesService.findOneByIdFinancing(
        payment.relatedEntityId,
      );

      // Validar estado
      if (
        !skipStatusValidation &&
        sale.status !== StatusSale.PENDING_APPROVAL &&
        sale.status !== StatusSale.IN_PAYMENT
      )
        throw new BadRequestException(
          `El pago no puede ser aprobado porque la venta no tiene aprobación de pago pendiente.`,
        );

      // Obtener financing entity
      const financing = await queryRunner.manager.findOne('financing', {
        where: { id: payment.relatedEntityId },
      } as any);

      if (!financing)
        throw new BadRequestException(
          `No se encontró el financiamiento con ID ${payment.relatedEntityId}`,
        );

      // Calcular monto inicial a pagar (la reserva ya se refleja en initialAmountPaid)
      const initialToPay = Number(
        Number(financing.initialAmount).toFixed(2),
      );

      // Actualizar montos
      const newPaid = Number(
        (
          Number(financing.initialAmountPaid || 0) + Number(payment.amount)
        ).toFixed(2),
      );
      const newPending = Number((initialToPay - newPaid).toFixed(2));

      await queryRunner.manager.update(
        'financing',
        { id: financing.id },
        {
          initialAmountPaid: newPaid,
          initialAmountPending: newPending > 0 ? newPending : 0,
        },
      );

      // Determinar nuevo estado
      let newStatus: StatusSale;
      if (newPending <= 0) {
        // Inicial completamente pagada - puede empezar a pagar cuotas
        newStatus = StatusSale.IN_PAYMENT_PROCESS;
      } else {
        // Pago parcial de inicial
        newStatus = StatusSale.IN_PAYMENT;
      }

      await this.salesService.updateStatusSale(sale.id, newStatus, queryRunner);

      return { saleId: sale.id, newStatus };
    }

    return null;
  }

  private async notifyNexusPaymentStatusChange(
    payment: Payment,
    reviewedById: string,
    saleStatus: string,
    action: PaymentNotificationAction,
  ): Promise<void> {
    try {
      const reviewer = await this.paymentRepository.manager.findOne('User', {
        where: { id: reviewedById },
        select: ['firstName', 'lastName', 'email'],
      } as any);

      const saleId = await this.extractSaleId(payment);
      if (!saleId) {
        this.logger.warn(
          `No se pudo determinar el saleId para notificar a Nexus. Payment ID: ${payment.id}`,
        );
        return;
      }

      const reviewerName = reviewer
        ? `${reviewer.firstName} ${reviewer.lastName}`
        : 'Usuario desconocido';
      const reviewerEmail = reviewer?.email || 'No disponible';

      const metadata = {
        'Revisado por': `${reviewerName} (${reviewerEmail})`,
        Fecha: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        'Monto del pago': payment.amount,
      };

      await this.nexusApiService.notifyPaymentApproved({
        saleId,
        saleStatus,
        action,
        metadata,
      });

      this.logger.log(
        `Notificación a Nexus exitosa (${action}) para Payment ID: ${payment.id}, Sale ID: ${saleId}, Status: ${saleStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al notificar a Nexus (${action}) para Payment ID: ${payment.id}. Error: ${error.message}`,
        error.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  private async extractSaleId(payment: Payment): Promise<string | null> {
    if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
      return payment.relatedEntityId;
    }

    if (
      payment.relatedEntityType === 'reservation' &&
      payment.relatedEntityId
    ) {
      return payment.relatedEntityId;
    }

    if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
      const sale = await this.salesService.findOneByIdFinancing(
        payment.relatedEntityId,
      );
      return sale?.id || null;
    }

    if (
      payment.relatedEntityType === 'financingInstallments' &&
      payment.relatedEntityId
    ) {
      const installment =
        await this.financingInstallmentsService.findOneWithPayments(
          payment.relatedEntityId,
        );
      return installment?.financing?.sale?.id || null;
    }

    return null;
  }
}
