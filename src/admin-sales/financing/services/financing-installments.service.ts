import { InjectRepository } from "@nestjs/typeorm";
import { FinancingInstallments } from "../entities/financing-installments.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreateFinancingInstallmentsDto } from "../dto/create-financing-installments.dto";
import { StatusFinancingInstallments } from "../enums/status-financing-installments.enum";
import { CreateDetailPaymentDto } from "src/admin-payments/payments/dto/create-detail-payment.dto";
import { BadRequestException, forwardRef, Inject, NotFoundException } from "@nestjs/common";
import { CreatePaymentDto } from "src/admin-payments/payments/dto/create-payment.dto";
import { MethodPayment } from "src/admin-payments/payments/enums/method-payment.enum";
import { PaymentsService } from "src/admin-payments/payments/services/payments.service";

export class FinancingInstallmentsService {
  constructor(
    @InjectRepository(FinancingInstallments)
    private readonly financingInstallmentsRepository: Repository<FinancingInstallments>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
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

  async findOneWithPayments(id: string): Promise<FinancingInstallments> {
    return await this.financingInstallmentsRepository.findOne({
      where: { id },
      relations: [
        'financing',
        'financing.sale',
        'financing.sale.client',
        'financing.sale.lot',
      ],
    });
  }

  async payInstallments(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    // Obtener las cuotas pendientes y con mora (si aplica)
    const installmentsToPay = await this.financingInstallmentsRepository.find({
      where: { 
        financing: { id: financingId },
        status: StatusFinancingInstallments.PENDING
      },
      order: { expectedPaymentDate: 'ASC' },
      lock: { mode: 'for_no_key_update' }
    });

    if (installmentsToPay.length === 0)
      throw new BadRequestException('No hay cuotas pendientes para pagar.');

    const totalPendingAmount = parseFloat(installmentsToPay.reduce((sum, installment) => {
      const currentPending = parseFloat(installment.coutePending.toFixed(2));
      const currentLateFeePending = parseFloat(installment.lateFeeAmountPending.toFixed(2));
      return sum + currentPending + currentLateFeePending;
    }, 0).toFixed(2));

    // Validar que el monto pagado no exceda el total pendiente (cuota + mora)
    if (amountPaid > totalPendingAmount)
      throw new BadRequestException(
        `El monto a pagar (${amountPaid.toFixed(2)}) excede el total pendiente de las cuotas y moras (${totalPendingAmount.toFixed(2)}).`
      );

    let remainingAmount = amountPaid;
    const paidInstallmentIds: string[] = [];

    for (const installment of installmentsToPay) {
      if (remainingAmount <= 0) break;

      // 1. Priorizar el pago de la mora pendiente
      if (installment.lateFeeAmountPending > 0 && remainingAmount > 0) {
        const payForLateFee = Math.min(remainingAmount, installment.lateFeeAmountPending);
        installment.lateFeeAmountPaid = parseFloat((installment.lateFeeAmountPaid + payForLateFee).toFixed(2));
        installment.lateFeeAmountPending = parseFloat((installment.lateFeeAmountPending - payForLateFee).toFixed(2));
        remainingAmount = parseFloat((remainingAmount - payForLateFee).toFixed(2));
      }

      // 2. Luego, pagar la cuota principal pendiente
      if (installment.coutePending > 0 && remainingAmount > 0) {
        const payForCoute = Math.min(remainingAmount, installment.coutePending);
        installment.coutePaid = parseFloat((installment.coutePaid + payForCoute).toFixed(2));
        installment.coutePending = parseFloat((installment.coutePending - payForCoute).toFixed(2));
        remainingAmount = parseFloat((remainingAmount - payForCoute).toFixed(2));
      }

      if (installment.coutePending <= 0 && installment.lateFeeAmountPending <= 0) {
        installment.status = StatusFinancingInstallments.PAID;
        paidInstallmentIds.push(installment.id);
      }

      await queryRunner.manager.save(installment);
    }

    // Registrar el pago en el sistema de pagos general
    const createPaymentDto: CreatePaymentDto = {
      methodPayment: MethodPayment.VOUCHER,
      amount: amountPaid,
      relatedEntityType: 'financingInstallments',
      relatedEntityId: financingId,
      metadata: {
        'Concepto de pago': 'Pago de cuotas de financiación',
        'Fecha de pago': new Date().toISOString(),
        'Monto de pago': amountPaid,
        'Cuotas afectadas': paidInstallmentIds.join(', ') // Para referencia
      },
      paymentDetails,
    };
    await this.paymentsService.create(createPaymentDto, files, userId, queryRunner);
  }

  // Método para buscar una cuota específica (podría ser útil para el frontend)
  async findOneInstallmentById(id: string): Promise<FinancingInstallments> {
    const installment = await this.financingInstallmentsRepository.findOne({ where: { id } });
    if (!installment) {
      throw new NotFoundException(`Cuota con ID ${id} no encontrada.`);
    }
    return installment;
  }
}