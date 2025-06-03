import { InjectRepository } from "@nestjs/typeorm";
import { FinancingInstallments } from "../entities/financing-installments.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreateFinancingInstallmentsDto } from "../dto/create-financing-installments.dto";
import { StatusFinancingInstallments } from "../enums/status-financing-installments.enum";

export class FinancingInstallmentsService {
  constructor(
    @InjectRepository(FinancingInstallments)
    private readonly financingInstallmentsRepository: Repository<FinancingInstallments>,
  ) {}
  create(createFinancingInstallmentsDto: CreateFinancingInstallmentsDto) {
    const { couteAmount, expectedPaymentDate } = createFinancingInstallmentsDto;
    const financingInstallments = this.financingInstallmentsRepository.create({
      couteAmount: couteAmount,
      coutePending: couteAmount,
      coutePaid: 0,
      expectedPaymentDate: expectedPaymentDate,
    });
    return this.financingInstallmentsRepository.save(financingInstallments);
  }
  
  async updateStatus(
    financingInstallmentsId: string,
    status: StatusFinancingInstallments,
    queryRunner?: QueryRunner
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(FinancingInstallments)
      : this.financingInstallmentsRepository;
    const financingInstallments = await repository.findOne({
      where: { id: financingInstallmentsId },
    });
    if (!financingInstallments)
      throw new Error(`No se encontró una cuota de financiamiento con ID ${financingInstallmentsId}`);
    financingInstallments.status = status;
    await repository.save(financingInstallments);
  }
}