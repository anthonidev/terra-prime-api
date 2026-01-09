import { InjectRepository } from "@nestjs/typeorm";
import { PaymentDetails } from "../entities/payment-details.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreateDetailPaymentDto } from "../dto/create-detail-payment.dto";
import { UpdateDetailPaymentDto } from "../dto/update-detail-payment.dto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AwsS3Service } from '../../../files/aws-s3.service';
import { CreateDetailPaymentWithUrlDto } from "../dto/create-detail-payment-with-url.dto";

export class PaymentsDetailService {
  constructor(
    @InjectRepository(PaymentDetails)
    private readonly paymentDetailsRepository: Repository<PaymentDetails>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async create(
    paymentId: number,
    detailDto: CreateDetailPaymentDto,
    file: Express.Multer.File,
    queryRunner?: QueryRunner,
  ): Promise<PaymentDetails> {
    let s3UploadResponse;
    try {
      s3UploadResponse = await this.awsS3Service.uploadImage(file, 'payment-vouchers');
    } catch (uploadError) {
      throw new BadRequestException(`Error al subir imagen del voucher ${detailDto.transactionReference} a S3: ${uploadError.message}`);
    }
    try {
      const repository = queryRunner ? queryRunner.manager.getRepository(PaymentDetails) : this.paymentDetailsRepository;
      const paymentDetail = repository.create({
        payment: { id: paymentId },
        url: s3UploadResponse.url,
        urlKey: s3UploadResponse.key,
        amount: detailDto.amount,
        bankName: detailDto.bankName,
        transactionReference: detailDto.transactionReference,
        codeOperation: detailDto.codeOperation,
        transactionDate: new Date(detailDto.transactionDate),
        isActive: true,
      });
      return await repository.save(paymentDetail);
    } catch (error) {
      if (s3UploadResponse && s3UploadResponse.key) {
        await this.awsS3Service.deleteFile(s3UploadResponse.key).catch(deleteErr => {
          console.error(`Failed to delete S3 file ${s3UploadResponse.key} during rollback: ${deleteErr.message}`);
        });
      }
      throw error;
    }
  }

  /**
   * Crea un detalle de pago usando URLs existentes (sin subir archivo a S3)
   * Usado para migración de datos
   */
  async createWithExistingUrl(
    paymentId: number,
    detailDto: CreateDetailPaymentWithUrlDto,
    queryRunner?: QueryRunner,
  ): Promise<PaymentDetails> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;

    const paymentDetail = repository.create({
      payment: { id: paymentId },
      url: detailDto.url,
      urlKey: detailDto.urlKey,
      amount: detailDto.amount,
      bankName: detailDto.bankName,
      transactionReference: detailDto.transactionReference,
      codeOperation: detailDto.codeOperation,
      transactionDate: new Date(detailDto.transactionDate),
      isActive: true,
    });

    return await repository.save(paymentDetail);
  }

  async delete(
    urlKey: string,
    detailId: number
  ): Promise<void> {
    try {
        // 1. Delete from S3
        const s3DeleteResult = await this.awsS3Service.deleteFile(urlKey);
        if (!s3DeleteResult.success) {
            console.warn(`Could not delete S3 file ${urlKey}: ${s3DeleteResult.message}`);
        }
        // 2. Delete from the database
        await this.paymentDetailsRepository.delete({ id: detailId });
    } catch (error) {
        console.error(`Error deleting payment detail ${detailId} and S3 file ${urlKey}:`, error);
        throw error;
    }
  }

  async update(
    detailId: number,
    updateDto: UpdateDetailPaymentDto,
    queryRunner?: QueryRunner,
  ): Promise<PaymentDetails> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;

    const detail = await repository.findOne({ where: { id: detailId } });

    if (!detail) {
      throw new NotFoundException(`Detalle de pago con ID ${detailId} no encontrado`);
    }

    if (!detail.isActive) {
      throw new BadRequestException(`No se puede actualizar un detalle de pago anulado`);
    }

    if (updateDto.amount !== undefined) detail.amount = updateDto.amount;
    if (updateDto.bankName !== undefined) detail.bankName = updateDto.bankName;
    if (updateDto.transactionReference !== undefined) detail.transactionReference = updateDto.transactionReference;
    if (updateDto.codeOperation !== undefined) detail.codeOperation = updateDto.codeOperation;
    if (updateDto.transactionDate !== undefined) detail.transactionDate = new Date(updateDto.transactionDate);

    return await repository.save(detail);
  }

  async deactivate(
    detailId: number,
    queryRunner?: QueryRunner,
  ): Promise<PaymentDetails> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;

    const detail = await repository.findOne({ where: { id: detailId } });

    if (!detail) {
      throw new NotFoundException(`Detalle de pago con ID ${detailId} no encontrado`);
    }

    if (!detail.isActive) {
      throw new BadRequestException(`El detalle de pago ya está anulado`);
    }

    detail.isActive = false;
    return await repository.save(detail);
  }

  async updateCodeOperation(
    detailId: number,
    codeOperation: string,
    queryRunner?: QueryRunner,
  ): Promise<PaymentDetails> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(PaymentDetails)
      : this.paymentDetailsRepository;

    const detail = await repository.findOne({
      where: { id: detailId },
      relations: ['payment']
    });

    if (!detail) {
      throw new NotFoundException(`Detalle de pago con ID ${detailId} no encontrado`);
    }

    if (!detail.isActive) {
      throw new BadRequestException(`No se puede actualizar un detalle de pago anulado`);
    }

    // Validar que el pago esté en estado PENDING
    if (detail.payment && detail.payment.status !== 'PENDING') {
      throw new BadRequestException(
        `No se puede actualizar el código de operación de un pago que no está en estado PENDIENTE`
      );
    }

    detail.codeOperation = codeOperation.trim();
    return await repository.save(detail);
  }
}