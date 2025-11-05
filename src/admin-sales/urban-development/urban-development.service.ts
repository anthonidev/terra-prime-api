import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UrbanDevelopment } from './entities/urban-development.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateUrbanDevelopmentDto } from './dto/create-urban-development.dto';
import { FinancingService } from '../financing/services/financing.service';
import { SalesService } from '../sales/sales.service';
import { StatusUrbanDevelopment } from './enums/status-urban-development.enum';

@Injectable()
export class UrbanDevelopmentService {
  constructor(
    @InjectRepository(UrbanDevelopment)
    private readonly urbanDevelopmentRepository: Repository<UrbanDevelopment>,
    private readonly financingService: FinancingService,
    @Inject(forwardRef(() => SalesService))
    private readonly saleService: SalesService,
  ) {}

  async create(
    createUrbanDevelopmentDto: CreateUrbanDevelopmentDto,
    queryRunner?: QueryRunner,
  ): Promise<UrbanDevelopment> {
    const { financingId, saleId, amount, initialAmount } = createUrbanDevelopmentDto;
    if(!queryRunner)
      await Promise.all([
        this.saleService.findOneById(saleId),
        this.financingService.findOneById(financingId),
      ]);
    const repository = queryRunner
      ? queryRunner.manager.getRepository(UrbanDevelopment)
      : this.urbanDevelopmentRepository;
    const urbanDevelopment = repository.create({
      amount,
      initialAmount,
      financing: { id: financingId },
      sale: { id: saleId },
      // Como el inicial de HU siempre es 0, comienza directamente en proceso de pago
      status: StatusUrbanDevelopment.IN_PAYMENT_PROCESS,
    });
    return await repository.save(urbanDevelopment);
  }

  async findOneBySaleId(saleId: string): Promise<UrbanDevelopment> {
    return await this.urbanDevelopmentRepository.findOne({
      where: { sale: { id: saleId } },
      relations: ['sale', 'financing', 'financing.financingInstallments'],
    });
  }

  async remove(id: number, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(UrbanDevelopment)
      : this.urbanDevelopmentRepository;
    const urbanDevelopment = await repository.findOne({
      where: { id },
      relations: ['financing'],
    });
    if (!urbanDevelopment) return;
    // Primero eliminar el financiamiento asociado
    if (urbanDevelopment.financing)
      await this.financingService.remove(urbanDevelopment.financing.id, queryRunner);
    // Luego eliminar la habilitación urbana
    await repository.remove(urbanDevelopment);
  }
}
