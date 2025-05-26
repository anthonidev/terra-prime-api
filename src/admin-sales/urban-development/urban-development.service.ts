import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UrbanDevelopment } from './entities/urban-development.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateUrbanDevelopmentDto } from './dto/create-urban-development.dto';
import { FinancingService } from '../financing/services/financing.service';
import { SalesService } from '../sales/sales.service';

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
    });
    return await repository.save(urbanDevelopment);
  }
}
