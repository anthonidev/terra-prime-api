import { BadRequestException, Injectable } from '@nestjs/common';
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

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentsDetailService: PaymentsDetailService,
    private readonly paymentConfigService: PaymentsConfigService
  ){}
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
}
