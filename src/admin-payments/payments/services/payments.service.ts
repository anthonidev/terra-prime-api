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
import { LotStatus } from 'src/project/entities/lot.entity';

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

      const paymentConfig = await this.paymentConfigService.findOneByCode('SALE_PAYMENT');
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

      if (payment.relatedEntityType === 'sale' && payment.relatedEntityId)
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.COMPLETED,
          queryRunner,
        );
      if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
        const sale = await this.salesService.findOneByIdFinancing(payment.relatedEntityId);
        await this.salesService.updateStatusSale(
          sale.id,
          StatusSale.IN_PAYMENT_PROCESS,
          queryRunner,
        );
      }
        
      if (payment.relatedEntityType === 'financingInstallments' && payment.relatedEntityId) {
        await this.financingInstallmentsService.updateStatus(
          payment.relatedEntityId,
          StatusFinancingInstallments.PAID,
          queryRunner,
        );
      }

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

      // POR DEFINIR
      if (payment.relatedEntityType === 'sale' && payment.relatedEntityId) {
        const sale = await this.salesService.findOneById(payment.relatedEntityId);
        await this.salesService.updateStatusSale(
          payment.relatedEntityId,
          StatusSale.REJECTED,
          queryRunner,
        );
        await this.lotService.updateStatus(sale.lot.id, LotStatus.ACTIVE, queryRunner);
      }
      if (payment.relatedEntityType === 'financing' && payment.relatedEntityId) {
        const sale = await this.salesService.findOneByIdFinancing(payment.relatedEntityId);
        await this.salesService.updateStatusSale(
          sale.id,
          StatusSale.REJECTED,
          queryRunner,
        );
        await this.lotService.updateStatus(sale.lot.id, LotStatus.ACTIVE, queryRunner);
      }
      if (payment.relatedEntityType === 'financingInstallments' && payment.relatedEntityId)
        await this.financingInstallmentsService.updateStatus(
          payment.relatedEntityId,
          StatusFinancingInstallments.PENDING,
          queryRunner,
        );
      // HASTA AQUI
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

  // Internal helpers methods
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
    return payment;
  }
}
