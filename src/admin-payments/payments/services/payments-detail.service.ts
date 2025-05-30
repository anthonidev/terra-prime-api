import { InjectRepository } from "@nestjs/typeorm";
import { PaymentDetails } from "../entities/payment-details.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreateDetailPaymentDto } from "../dto/create-detail-payment.dto";
import { BadRequestException } from "@nestjs/common";
import { AwsS3Service } from '../../../files/aws-s3.service';

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
}