import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentConfig } from "src/admin-payments/payments-config/entities/payments-config.entity";
import { Repository } from "typeorm";

@Injectable()
export class PaymentsConfigService {
  constructor(
    @InjectRepository(PaymentConfig)
    private readonly paymentConfigRepository: Repository<PaymentConfig>,
  ) {}
  async findOneByCode(code: string): Promise<PaymentConfig> {
    const paymentConfig = await this.paymentConfigRepository.findOne({
      where: { code },
    });
    if (!paymentConfig || !paymentConfig.isActive)
      throw new BadRequestException(
          'La opción de pago para órdenes no está disponible',
      );
    return paymentConfig;
  }
}