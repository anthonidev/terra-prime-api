import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { SaleParking } from './entities/sale-parking.entity';
import { CreateSaleParkingServiceDto } from './dto/create-sale-parking-service.dto';
import { SaleParkingResponseDto } from './dto/sale-parking-response.dto';
import { StatusUrbanDevelopment } from '../urban-development/enums/status-urban-development.enum';
import { FinancingService } from '../financing/services/financing.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class SaleParkingService {
  constructor(
    @InjectRepository(SaleParking)
    private readonly saleParkingRepository: Repository<SaleParking>,
    private readonly financingService: FinancingService,
    @Inject(forwardRef(() => SalesService))
    private readonly salesService: SalesService,
  ) {}

  async create(
    dto: CreateSaleParkingServiceDto,
    queryRunner?: QueryRunner,
  ): Promise<SaleParking> {
    const { saleId, financingId, parkingId, amount, initialAmount } = dto;

    const repository = queryRunner
      ? queryRunner.manager.getRepository(SaleParking)
      : this.saleParkingRepository;

    const status =
      initialAmount === 0
        ? StatusUrbanDevelopment.IN_PAYMENT_PROCESS
        : StatusUrbanDevelopment.PENDING;

    const saleParking = repository.create({
      sale: { id: saleId },
      financing: { id: financingId },
      parking: { id: parkingId },
      amount,
      initialAmount,
      status,
    });

    return await repository.save(saleParking);
  }

  async findBySaleId(saleId: string): Promise<SaleParkingResponseDto[]> {
    const saleParkings = await this.saleParkingRepository.find({
      where: { sale: { id: saleId } },
      relations: ['parking', 'financing', 'financing.financingInstallments'],
    });

    return saleParkings.map((sp) => {
      const installments = sp.financing?.financingInstallments ?? [];
      const totalCouteAmount = installments.reduce((sum, i) => sum + Number(i.couteAmount), 0);
      const totalPaid = installments.reduce((sum, i) => sum + Number(i.coutePaid), 0);
      const totalPending = installments.reduce((sum, i) => sum + Number(i.coutePending), 0);

      return {
        id: sp.id,
        parkingId: sp.parking.id,
        parkingName: sp.parking.name,
        amount: Number(sp.amount),
        initialAmount: Number(sp.initialAmount),
        status: sp.status,
        financing: sp.financing
          ? {
              id: sp.financing.id,
              initialAmount: Number(sp.financing.initialAmount),
              initialAmountPaid: Number(sp.financing.initialAmountPaid ?? 0),
              initialAmountPending: Number(sp.financing.initialAmountPending ?? 0),
              interestRate: Number(sp.financing.interestRate ?? 0),
              interestRateSections: sp.financing.interestRateSections ?? null,
              quantityCoutes: Number(sp.financing.quantityCoutes),
              totalCouteAmount: parseFloat(totalCouteAmount.toFixed(2)),
              totalPaid: parseFloat(totalPaid.toFixed(2)),
              totalPending: parseFloat(totalPending.toFixed(2)),
              installments: installments
                .sort((a, b) => (a.numberCuote || 0) - (b.numberCuote || 0))
                .map((i) => ({
                  id: i.id,
                  numberCuote: i.numberCuote,
                  couteAmount: Number(i.couteAmount),
                  coutePending: Number(i.coutePending),
                  coutePaid: Number(i.coutePaid),
                  expectedPaymentDate: i.expectedPaymentDate
                    ? i.expectedPaymentDate.toISOString()
                    : null,
                  status: i.status,
                })),
            }
          : null,
        createdAt: sp.createdAt,
      };
    });
  }

  async remove(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(SaleParking)
      : this.saleParkingRepository;

    const saleParking = await repository.findOne({
      where: { id },
      relations: ['financing'],
    });

    if (!saleParking) return;

    if (saleParking.financing) {
      await this.financingService.remove(saleParking.financing.id, queryRunner);
    }

    await repository.remove(saleParking);
  }
}
