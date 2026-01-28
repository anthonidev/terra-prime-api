import { InjectRepository } from '@nestjs/typeorm';
import { FinancingInstallments } from '../entities/financing-installments.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateFinancingInstallmentsDto } from '../dto/create-financing-installments.dto';
import { StatusFinancingInstallments } from '../enums/status-financing-installments.enum';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import {
  BadRequestException,
  forwardRef,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from 'src/admin-payments/payments/dto/create-payment.dto';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { PaymentsService } from 'src/admin-payments/payments/services/payments.service';
import { PaymentResponse } from 'src/admin-payments/payments/interfaces/payment-response.interface';
import { TransactionService } from 'src/common/services/transaction.service';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { InstallmentWithPayments } from '../interfaces/installment-with-payments.interface';
import { PaymentContribution } from '../interfaces/payment-contribution.interface';
import { CreateDetailPaymentWithUrlDto } from 'src/admin-payments/payments/dto/create-detail-payment-with-url.dto';
import { CreatePaymentWithUrlDto } from 'src/admin-payments/payments/dto/create-payment-with-url.dto';

export class FinancingInstallmentsService {
  constructor(
    @InjectRepository(FinancingInstallments)
    private readonly financingInstallmentsRepository: Repository<FinancingInstallments>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly transactionService: TransactionService,
  ) { }
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
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(FinancingInstallments)
      : this.financingInstallmentsRepository;
    const financingInstallments = await repository.findOne({
      where: { id: financingInstallmentsId },
    });
    if (!financingInstallments)
      throw new Error(
        `No se encontró una cuota de financiamiento con ID ${financingInstallmentsId}`,
      );
    financingInstallments.status = status;
    await repository.save(financingInstallments);
  }

  async findOneWithPayments(id: string): Promise<Sale | null> {
    const financingInstallments =
      await this.financingInstallmentsRepository.findOne({
        where: { financing: { id } },
        relations: [
          'financing',
          'financing.sale',
          'financing.sale.client',
          'financing.sale.lot',
          'financing.sale.lot.block',
          'financing.sale.lot.block.stage',
          'financing.sale.lot.block.stage.project',
          'financing.urbanDevelopment',
          'financing.urbanDevelopment.sale',
          'financing.urbanDevelopment.sale.client',
          'financing.urbanDevelopment.sale.lot',
          'financing.urbanDevelopment.sale.lot.block',
          'financing.urbanDevelopment.sale.lot.block.stage',
          'financing.urbanDevelopment.sale.lot.block.stage.project',
        ],
      });

    if (!financingInstallments) return null;

    return (
      financingInstallments.financing.sale ||
      financingInstallments.financing.urbanDevelopment?.sale ||
      null
    );
  }

  async payInstallments(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
  ): Promise<PaymentResponse> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    await this.paymentsService.isValidPaymentConfig(
      'financingInstallments',
      financingId,
    );

    const installmentsToPay = await this.financingInstallmentsRepository.find({
      where: {
        financing: { id: financingId },
        status: StatusFinancingInstallments.PENDING,
      },
      order: { expectedPaymentDate: 'ASC' },
    });

    if (installmentsToPay.length === 0)
      throw new BadRequestException('No hay cuotas pendientes para pagar.');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        // Solo considerar el principal pendiente (sin moras - las moras se pagan por separado)
        const totalPendingAmount = parseFloat(
          installmentsToPay
            .reduce((sum, installment) => {
              const currentPending = parseFloat(
                Number(installment.coutePending ?? 0).toFixed(2),
              );
              return sum + currentPending;
            }, 0)
            .toFixed(2),
        );

        if (amountPaid > totalPendingAmount)
          throw new BadRequestException(
            `El monto a pagar (${amountPaid.toFixed(2)}) excede el total pendiente de las cuotas (${totalPendingAmount.toFixed(2)}).`,
          );

        let remainingAmount = amountPaid;
        const paidInstallmentIds: string[] = [];

        // Guardar el estado anterior de las cuotas para poder revertir
        const installmentsBackup = installmentsToPay.map((installment) => ({
          id: installment.id,
          previousLateFeeAmountPending: installment.lateFeeAmountPending,
          previousLateFeeAmountPaid: installment.lateFeeAmountPaid,
          previousCoutePending: installment.coutePending,
          previousCoutePaid: installment.coutePaid,
          previousStatus: installment.status,
        }));

        await this.calculateAmountInCoutes(
          installmentsToPay,
          remainingAmount,
          queryRunner,
          paidInstallmentIds,
        );

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
            'Cuotas afectadas': paidInstallmentIds.join(', '),
            // Guardar información para revertir
            installmentsBackup: JSON.stringify(installmentsBackup),
          },
          paymentDetails,
        };

        return await this.paymentsService.create(
          createPaymentDto,
          files,
          userId,
          queryRunner,
        );
      },
    );
  }

  /**
   * Pagar cuotas con auto-aprobación (para uso de ADM)
   * El pago se crea directamente con estado APPROVED
   */
  async payInstallmentsAutoApproved(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
    observation?: string,
  ): Promise<PaymentResponse> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    await this.paymentsService.isValidPaymentConfig(
      'financingInstallments',
      financingId,
    );

    const installmentsToPay = await this.financingInstallmentsRepository.find({
      where: {
        financing: { id: financingId },
        status: StatusFinancingInstallments.PENDING,
      },
      order: { expectedPaymentDate: 'ASC' },
    });

    if (installmentsToPay.length === 0)
      throw new BadRequestException('No hay cuotas pendientes para pagar.');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        // Solo considerar el principal pendiente (sin moras - las moras se pagan por separado)
        const totalPendingAmount = parseFloat(
          installmentsToPay
            .reduce((sum, installment) => {
              const currentPending = parseFloat(
                Number(installment.coutePending ?? 0).toFixed(2),
              );
              return sum + currentPending;
            }, 0)
            .toFixed(2),
        );

        if (amountPaid > totalPendingAmount)
          throw new BadRequestException(
            `El monto a pagar (${amountPaid.toFixed(2)}) excede el total pendiente de las cuotas (${totalPendingAmount.toFixed(2)}).`,
          );

        // NUEVO: Guardar el estado anterior de las cuotas para poder revertir
        const installmentsBackup = installmentsToPay.map((installment) => ({
          id: installment.id,
          previousLateFeeAmountPending: installment.lateFeeAmountPending,
          previousLateFeeAmountPaid: installment.lateFeeAmountPaid,
          previousCoutePending: installment.coutePending,
          previousCoutePaid: installment.coutePaid,
          previousStatus: installment.status,
        }));

        // Calcular pagos y obtener detalles de cuotas afectadas
        const affectedInstallmentsDetails = await this.calculateAmountInCoutesWithDetails(
          installmentsToPay,
          amountPaid,
          queryRunner,
        );

        // Construir metadata con el nuevo formato
        const cuotasAfectadas: Record<string, any> = {};
        for (const detail of affectedInstallmentsDetails) {
          cuotasAfectadas[`Cuota ${detail.numberCuote}`] = {
            Modo: detail.mode,
            'Monto aplicado': detail.amountApplied,
            'Pendiente después de este pago': detail.pendingAfterPayment,
          };
        }

        // Registrar el pago en el sistema de pagos general
        const createPaymentDto: CreatePaymentDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: amountPaid,
          relatedEntityType: 'financingInstallments',
          relatedEntityId: financingId,
          metadata: {
            'Concepto de pago': 'Pago de cuotas de financiación (Auto-aprobado)',
            'Cuotas afectadas': cuotasAfectadas,
            installmentsBackup: JSON.stringify(installmentsBackup),
          },
          paymentDetails,
        };

        return await this.paymentsService.createAutoApproved(
          createPaymentDto,
          files,
          userId,
          dateOperation,
          numberTicket,
          queryRunner,
          observation,
        );
      },
    );
  }

  /**
   * MÉTODO PARA MIGRACIÓN DE DATOS
   * Pagar cuotas con auto-aprobación usando URLs existentes (sin subir archivos)
   * El pago se crea directamente con estado APPROVED
   * SIGUE EXACTAMENTE LA MISMA LÓGICA DE payInstallmentsAutoApproved
   */
  async payInstallmentsAutoApprovedWithUrls(
    financingId: string,
    amountPaid: number,
    paymentDetailsWithUrls: CreateDetailPaymentWithUrlDto[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
  ): Promise<PaymentResponse> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    await this.paymentsService.isValidPaymentConfig(
      'financingInstallments',
      financingId,
    );

    const installmentsToPay = await this.financingInstallmentsRepository.find({
      where: {
        financing: { id: financingId },
        status: StatusFinancingInstallments.PENDING,
      },
      order: { expectedPaymentDate: 'ASC' },
    });

    if (installmentsToPay.length === 0)
      throw new BadRequestException('No hay cuotas pendientes para pagar.');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        // Solo considerar el principal pendiente (sin moras - las moras se pagan por separado)
        const totalPendingAmount = parseFloat(
          installmentsToPay
            .reduce((sum, installment) => {
              const currentPending = parseFloat(
                Number(installment.coutePending ?? 0).toFixed(2),
              );
              return sum + currentPending;
            }, 0)
            .toFixed(2),
        );

        if (amountPaid > totalPendingAmount)
          throw new BadRequestException(
            `El monto a pagar (${amountPaid.toFixed(2)}) excede el total pendiente de las cuotas (${totalPendingAmount.toFixed(2)}).`,
          );

        // NUEVO: Guardar el estado anterior de las cuotas para poder revertir
        const installmentsBackup = installmentsToPay.map((installment) => ({
          id: installment.id,
          previousLateFeeAmountPending: installment.lateFeeAmountPending,
          previousLateFeeAmountPaid: installment.lateFeeAmountPaid,
          previousCoutePending: installment.coutePending,
          previousCoutePaid: installment.coutePaid,
          previousStatus: installment.status,
        }));

        // Calcular pagos y obtener detalles de cuotas afectadas
        const affectedInstallmentsDetails = await this.calculateAmountInCoutesWithDetails(
          installmentsToPay,
          amountPaid,
          queryRunner,
        );

        // Construir metadata con el nuevo formato
        const cuotasAfectadas: Record<string, any> = {};
        for (const detail of affectedInstallmentsDetails) {
          cuotasAfectadas[`Cuota ${detail.numberCuote}`] = {
            Modo: detail.mode,
            'Monto aplicado': detail.amountApplied,
            'Pendiente después de este pago': detail.pendingAfterPayment,
          };
        }

        // Registrar el pago en el sistema de pagos general con URLs existentes
        const createPaymentWithUrlDto: CreatePaymentWithUrlDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: amountPaid,
          relatedEntityType: 'financingInstallments',
          relatedEntityId: financingId,
          metadata: {
            'Concepto de pago': 'Pago de cuotas de financiación (Auto-aprobado)',
            'Cuotas afectadas': cuotasAfectadas,
            installmentsBackup: JSON.stringify(installmentsBackup),
          },
          paymentDetails: paymentDetailsWithUrls,
          userId: userId,
          dateOperation: dateOperation,
          numberTicket: numberTicket,
        };

        return await this.paymentsService.createAutoApprovedWithUrls(
          createPaymentWithUrlDto,
          queryRunner,
        );
      },
    );
  }

  /**
   * Calcula el pago en cuotas y retorna los detalles de las cuotas afectadas
   */
  private async calculateAmountInCoutesWithDetails(
    installmentsToPay: FinancingInstallments[],
    remainingAmount: number,
    queryRunner: QueryRunner,
  ): Promise<Array<{
    numberCuote: number;
    mode: 'Total' | 'Parcial';
    amountApplied: number;
    pendingAfterPayment: number;
  }>> {
    let amountLeft = Number(remainingAmount.toFixed(2));
    const affectedInstallments: Array<{
      numberCuote: number;
      mode: 'Total' | 'Parcial';
      amountApplied: number;
      pendingAfterPayment: number;
    }> = [];

    for (const installment of installmentsToPay) {
      if (amountLeft <= 0) break;

      // Solo el principal, sin moras
      const pendingAmount = Number(
        (installment.couteAmount - (installment.coutePaid || 0)).toFixed(2),
      );

      if (pendingAmount > 0) {
        const paymentAmount = Math.min(amountLeft, pendingAmount);

        installment.coutePaid = Number(
          (Number(installment.coutePaid || 0) + paymentAmount).toFixed(2),
        );
        installment.coutePending = Number(
          (installment.couteAmount - installment.coutePaid).toFixed(2),
        );
        amountLeft = Number((amountLeft - paymentAmount).toFixed(2));

        // Determinar modo (Total o Parcial) basado solo en el principal
        const isPrincipalPaidCompletely = installment.coutePending <= 0;
        const hasLateFee = Number(installment.lateFeeAmountPending ?? 0) > 0;

        // Determinar estado según principal y moras
        if (isPrincipalPaidCompletely && !hasLateFee) {
          // Principal pagado y sin moras pendientes -> PAID
          installment.status = StatusFinancingInstallments.PAID;
        } else if (hasLateFee) {
          // Tiene moras pendientes -> EXPIRED
          installment.status = StatusFinancingInstallments.EXPIRED;
        } else {
          // Principal pendiente, sin moras -> PENDING
          installment.status = StatusFinancingInstallments.PENDING;
        }

        // Agregar a la lista de cuotas afectadas
        affectedInstallments.push({
          numberCuote: installment.numberCuote,
          mode: isPrincipalPaidCompletely ? 'Total' : 'Parcial',
          amountApplied: paymentAmount,
          pendingAfterPayment: Number(installment.coutePending.toFixed(2)),
        });
      }

      await queryRunner.manager.save(installment);
    }

    return affectedInstallments;
  }

  async updateAmountsPayment(
    financingInstallmentsId: string,
    lateFeeAmountPending: number,
    lateFeeAmountPaid: number,
    coutePending: number,
    cuotePaid: number,
    status: StatusFinancingInstallments,
    queryRunner?: QueryRunner,
  ): Promise<FinancingInstallments> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(FinancingInstallments)
      : this.financingInstallmentsRepository;
    const financingInstallments = await repository.findOne({
      where: { id: financingInstallmentsId },
    });
    if (!financingInstallments)
      throw new Error(
        `No se encontró una cuota de financiamiento con ID ${financingInstallmentsId}`,
      );
    financingInstallments.lateFeeAmountPending = lateFeeAmountPending;
    financingInstallments.lateFeeAmountPaid = lateFeeAmountPaid;
    financingInstallments.coutePending = coutePending;
    financingInstallments.coutePaid = cuotePaid;
    financingInstallments.status = status;
    return await repository.save(financingInstallments);
  }

  // Método para buscar una cuota específica (podría ser útil para el frontend)
  async findOneInstallmentById(id: string): Promise<FinancingInstallments> {
    const installment = await this.financingInstallmentsRepository.findOne({
      where: { id },
    });
    if (!installment) {
      throw new NotFoundException(`Cuota con ID ${id} no encontrada.`);
    }
    return installment;
  }

  private async calculateAmountInCoutes(
    installmentsToPay: FinancingInstallments[],
    remainingAmount: number,
    queryRunner: QueryRunner,
    paidInstallmentIds: string[],
  ) {
    // Convertir remainingAmount a número preciso
    let amountLeft = Number(remainingAmount.toFixed(2));

    for (const installment of installmentsToPay) {
      if (amountLeft <= 0) break;

      // Calcular el monto pendiente real de esta cuota (solo principal, sin moras)
      const pendingAmount = Number(
        (installment.couteAmount - (installment.coutePaid || 0)).toFixed(2),
      );

      // Solo procesar si hay algo pendiente
      if (pendingAmount > 0) {
        const paymentAmount = Math.min(amountLeft, pendingAmount);

        // Actualizar valores del principal
        installment.coutePaid = Number(
          (Number(installment.coutePaid || 0) + paymentAmount).toFixed(2),
        );
        installment.coutePending = Number(
          (installment.couteAmount - installment.coutePaid).toFixed(2),
        );
        amountLeft = Number((amountLeft - paymentAmount).toFixed(2));

        // Determinar estado según principal y moras
        const hasLateFee = Number(installment.lateFeeAmountPending ?? 0) > 0;

        if (installment.coutePending <= 0 && !hasLateFee) {
          // Principal pagado y sin moras pendientes -> PAID
          installment.status = StatusFinancingInstallments.PAID;
          paidInstallmentIds.push(installment.id);
        } else if (hasLateFee) {
          // Tiene moras pendientes -> EXPIRED
          installment.status = StatusFinancingInstallments.EXPIRED;
        } else {
          // Principal pendiente, sin moras -> PENDING
          installment.status = StatusFinancingInstallments.PENDING;
        }
      }

      await queryRunner.manager.save(installment);
    }
  }

  async getInstallmentsWithPayments(financingId: string) {
    // Obtener todas las cuotas ordenadas por fecha de vencimiento
    const installments = await this.financingInstallmentsRepository.find({
      where: { financing: { id: financingId } },
      order: { expectedPaymentDate: 'ASC' },
    });

    // Obtener todos los pagos de cuotas de esta financiación, ordenados por fecha
    const payments = await this.paymentsService.findPaymentsByRelatedEntity(
      'financingInstallments',
      financingId,
    );

    // Filtrar solo pagos aprobados y ordenarlos cronológicamente
    const approvedPayments = payments
      .filter((payment) => payment.status === 'APPROVED') // Ajustar según tu enum
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    // Calcular la distribución de cada pago
    const installmentPayments = this.calculatePaymentDistribution(
      installments,
      approvedPayments,
    );

    return installmentPayments;
  }

  private calculatePaymentDistribution(
    installments: FinancingInstallments[],
    payments: any[],
  ): InstallmentWithPayments[] {
    // Crear una copia de las cuotas para simular
    const simulatedInstallments = installments.map((installment) => ({
      id: installment.id,
      numberCuote: installment.numberCuote,
      couteAmount: installment.couteAmount,
      coutePaid: 0, // Empezamos desde 0 para simular
      coutePending: installment.couteAmount,
      expectedPaymentDate: installment.expectedPaymentDate.toDateString(),
      lateFeeAmountPending: installment.lateFeeAmountPending,
      lateFeeAmountPaid: 0,
      status: installment.status,
      payments: [] as PaymentContribution[],
    }));

    // Aplicar cada pago secuencialmente
    for (const payment of payments) {
      this.simulatePaymentApplication(simulatedInstallments, payment);
    }

    return simulatedInstallments;
  }

  private simulatePaymentApplication(
    installments: InstallmentWithPayments[],
    payment: any,
  ): void {
    let remainingAmount = Number(payment.amount);

    for (const installment of installments) {
      if (remainingAmount <= 0) break;

      // Calcular monto total pendiente de esta cuota (moras + principal)
      const lateFeeAmountPending = Number(
        Number(installment.lateFeeAmountPending).toFixed(2),
      );
      const principalAmountPending = Number(
        Number(installment.coutePending).toFixed(2),
      );
      const totalPendingForThisInstallment =
        lateFeeAmountPending + principalAmountPending;

      if (totalPendingForThisInstallment > 0) {
        // Calcular cuánto de este pago se aplica a esta cuota
        const paymentAmountForThisInstallment = Math.min(
          remainingAmount,
          totalPendingForThisInstallment,
        );

        if (paymentAmountForThisInstallment > 0) {
          // Variables para rastrear la distribución del pago
          let amountAppliedToLateFee = 0;
          let amountAppliedToPrincipal = 0;
          let remainingForThisInstallment = paymentAmountForThisInstallment;

          // PASO 1: Primero pagar las moras (si las hay)
          if (lateFeeAmountPending > 0 && remainingForThisInstallment > 0) {
            amountAppliedToLateFee = Math.min(
              remainingForThisInstallment,
              lateFeeAmountPending,
            );

            // Actualizar estado de las moras
            installment.lateFeeAmountPaid = Number(
              (
                Number(installment.lateFeeAmountPaid) + amountAppliedToLateFee
              ).toFixed(2),
            );
            installment.lateFeeAmountPending = Number(
              (
                Number(installment.lateFeeAmountPending) -
                amountAppliedToLateFee
              ).toFixed(2),
            );

            remainingForThisInstallment = Number(
              (remainingForThisInstallment - amountAppliedToLateFee).toFixed(2),
            );
          }

          // PASO 2: Luego pagar el monto principal (si sobra dinero)
          if (principalAmountPending > 0 && remainingForThisInstallment > 0) {
            amountAppliedToPrincipal = Math.min(
              remainingForThisInstallment,
              principalAmountPending,
            );

            // Actualizar estado del principal
            installment.coutePaid = Number(
              (
                Number(installment.coutePaid) + amountAppliedToPrincipal
              ).toFixed(2),
            );
            installment.coutePending = Number(
              (
                Number(installment.coutePending) - amountAppliedToPrincipal
              ).toFixed(2),
            );
          }

          // Registrar la contribución de este pago a esta cuota
          if (amountAppliedToLateFee > 0 || amountAppliedToPrincipal > 0) {
            installment.payments.push({
              paymentId: payment.id,
              amountApplied: paymentAmountForThisInstallment,
              amountAppliedToLateFee: amountAppliedToLateFee,
              amountAppliedToPrincipal: amountAppliedToPrincipal,
              paymentDate: payment.createdAt,
              paymentStatus: payment.status,
              banckName: payment.banckName,
              dateOperation: payment.dateOperation,
              numberTicket: payment.numberTicket,
            });
          }

          // Actualizar el monto restante del pago
          remainingAmount = Number(
            (remainingAmount - paymentAmountForThisInstallment).toFixed(2),
          );

          // Actualizar status si la cuota queda completamente pagada (sin moras ni principal pendiente)
          if (
            installment.coutePending <= 0 &&
            installment.lateFeeAmountPending <= 0
          ) {
            installment.status = StatusFinancingInstallments.PAID;
          }
        }
      }
    }
  }

  async increaseLateFeesForOverdueInstallments(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    totalPoints?: number;
  }> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(23, 59, 59, 999); // Fin del día hace 3 días

    // Buscar cuotas vencidas con período de gracia expirado
    const overdueInstallments = await this.financingInstallmentsRepository
      .createQueryBuilder('installment')
      .leftJoinAndSelect('installment.financing', 'financing')
      .leftJoin('financing.sale', 'sale')
      .leftJoin('financing.urbanDevelopment', 'urbanDevelopment')
      .leftJoin('urbanDevelopment.sale', 'urbanDevSale')
      .where('installment.status IN (:...statuses)', {
        statuses: [
          StatusFinancingInstallments.PENDING,
          StatusFinancingInstallments.EXPIRED,
        ],
      })
      .andWhere('installment.expectedPaymentDate < :threeDaysAgo', {
        threeDaysAgo,
      })
      .andWhere(
        '(sale.applyLateFee = true OR urbanDevSale.applyLateFee = true)',
      )
      .getMany();

    let successful = 0;
    let failed = 0;

    for (const installment of overdueInstallments) {
      try {
        // Aumentar el monto de mora en 5
        const currentLateFeeAmount = Number(installment.lateFeeAmount) || 0;
        const currentLateFeeAmountPending =
          Number(installment.lateFeeAmountPending) || 0;

        installment.lateFeeAmount = Number(
          (currentLateFeeAmount + 5).toFixed(2),
        );
        installment.lateFeeAmountPending = Number(
          (currentLateFeeAmountPending + 5).toFixed(2),
        );

        // Actualizar estado a EXPIRED si aún está PENDING
        if (installment.status === StatusFinancingInstallments.PENDING) {
          installment.status = StatusFinancingInstallments.EXPIRED;
        }

        await this.financingInstallmentsRepository.save(installment);
        successful++;
      } catch (error) {
        console.error(
          `Error al aumentar mora para cuota ${installment.id}:`,
          error.message,
        );
        failed++;
      }
    }

    return {
      processed: overdueInstallments.length,
      successful,
      failed,
      totalPoints: overdueInstallments.length,
    };
  }

  /**
   * Obtener cuotas con moras pendientes de un financiamiento
   */
  async getInstallmentsWithPendingLateFees(financingId: string) {
    const installments = await this.financingInstallmentsRepository.find({
      where: {
        financing: { id: financingId },
        status: StatusFinancingInstallments.EXPIRED,
      },
      order: { expectedPaymentDate: 'ASC' },
    });

    // Filtrar solo las que tienen mora pendiente
    return installments.filter(
      (installment) => Number(installment.lateFeeAmountPending ?? 0) > 0,
    );
  }

  /**
   * Obtener total de moras pendientes de un financiamiento
   */
  async getTotalPendingLateFees(financingId: string): Promise<number> {
    const installmentsWithLateFees =
      await this.getInstallmentsWithPendingLateFees(financingId);

    return parseFloat(
      installmentsWithLateFees
        .reduce((sum, installment) => {
          return sum + Number(installment.lateFeeAmountPending ?? 0);
        }, 0)
        .toFixed(2),
    );
  }

  /**
   * Pagar moras de cuotas (pago separado con IGV)
   */
  async payLateFees(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
  ): Promise<PaymentResponse> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    await this.paymentsService.isValidPaymentConfig('lateFee', financingId);

    // Buscar cuotas con moras pendientes
    const installmentsWithLateFees =
      await this.getInstallmentsWithPendingLateFees(financingId);

    if (installmentsWithLateFees.length === 0)
      throw new BadRequestException('No hay moras pendientes para pagar.');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        const totalLateFeesPending = parseFloat(
          installmentsWithLateFees
            .reduce((sum, installment) => {
              return sum + Number(installment.lateFeeAmountPending ?? 0);
            }, 0)
            .toFixed(2),
        );

        if (amountPaid > totalLateFeesPending)
          throw new BadRequestException(
            `El monto a pagar (${amountPaid.toFixed(2)}) excede el total de moras pendientes (${totalLateFeesPending.toFixed(2)}).`,
          );

        const paidInstallmentIds: string[] = [];

        // Guardar el estado anterior para poder revertir
        const installmentsBackup = installmentsWithLateFees.map(
          (installment) => ({
            id: installment.id,
            previousLateFeeAmountPending: installment.lateFeeAmountPending,
            previousLateFeeAmountPaid: installment.lateFeeAmountPaid,
            previousStatus: installment.status,
          }),
        );

        // Aplicar el pago a las moras
        await this.calculateLateFeePayment(
          installmentsWithLateFees,
          amountPaid,
          queryRunner,
          paidInstallmentIds,
        );

        // Registrar el pago en el sistema de pagos general
        const createPaymentDto: CreatePaymentDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: amountPaid,
          relatedEntityType: 'lateFee',
          relatedEntityId: financingId,
          metadata: {
            'Concepto de pago': 'Pago de moras de financiación',
            'Fecha de pago': new Date().toISOString(),
            'Monto de pago': amountPaid,
            'Cuotas con moras afectadas': paidInstallmentIds.join(', '),
            installmentsBackup: JSON.stringify(installmentsBackup),
          },
          paymentDetails,
        };

        return await this.paymentsService.create(
          createPaymentDto,
          files,
          userId,
          queryRunner,
        );
      },
    );
  }

  /**
   * Pagar moras con auto-aprobación (para uso de ADM)
   */
  async payLateFeesAutoApproved(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
    observation?: string,
  ): Promise<PaymentResponse> {
    if (amountPaid <= 0)
      throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

    await this.paymentsService.isValidPaymentConfig('lateFee', financingId);

    const installmentsWithLateFees =
      await this.getInstallmentsWithPendingLateFees(financingId);

    if (installmentsWithLateFees.length === 0)
      throw new BadRequestException('No hay moras pendientes para pagar.');

    return await this.transactionService.runInTransaction(
      async (queryRunner) => {
        const totalLateFeesPending = parseFloat(
          installmentsWithLateFees
            .reduce((sum, installment) => {
              return sum + Number(installment.lateFeeAmountPending ?? 0);
            }, 0)
            .toFixed(2),
        );

        if (amountPaid > totalLateFeesPending)
          throw new BadRequestException(
            `El monto a pagar (${amountPaid.toFixed(2)}) excede el total de moras pendientes (${totalLateFeesPending.toFixed(2)}).`,
          );

        // Calcular pagos y obtener detalles
        const affectedInstallmentsDetails =
          await this.calculateLateFeePaymentWithDetails(
            installmentsWithLateFees,
            amountPaid,
            queryRunner,
          );

        // Construir metadata
        const morasAfectadas: Record<string, any> = {};
        for (const detail of affectedInstallmentsDetails) {
          morasAfectadas[`Cuota ${detail.numberCuote}`] = {
            Modo: detail.mode,
            'Mora aplicada': detail.amountApplied,
            'Mora pendiente después de este pago': detail.pendingAfterPayment,
          };
        }

        const createPaymentDto: CreatePaymentDto = {
          methodPayment: MethodPayment.VOUCHER,
          amount: amountPaid,
          relatedEntityType: 'lateFee',
          relatedEntityId: financingId,
          metadata: {
            'Concepto de pago': 'Pago de moras de financiación (Auto-aprobado)',
            'Moras afectadas': morasAfectadas,
          },
          paymentDetails,
        };

        return await this.paymentsService.createAutoApproved(
          createPaymentDto,
          files,
          userId,
          dateOperation,
          numberTicket,
          queryRunner,
          observation,
        );
      },
    );
  }

  /**
   * Calcula el pago de moras y actualiza las cuotas
   */
  private async calculateLateFeePayment(
    installmentsWithLateFees: FinancingInstallments[],
    remainingAmount: number,
    queryRunner: QueryRunner,
    paidInstallmentIds: string[],
  ) {
    let amountLeft = Number(remainingAmount.toFixed(2));

    for (const installment of installmentsWithLateFees) {
      if (amountLeft <= 0) break;

      const lateFeeAmountPending = Number(
        (installment.lateFeeAmountPending ?? 0).toFixed(2),
      );

      if (lateFeeAmountPending > 0) {
        const paymentAmount = Math.min(amountLeft, lateFeeAmountPending);

        // Actualizar valores de mora
        installment.lateFeeAmountPaid = Number(
          (Number(installment.lateFeeAmountPaid || 0) + paymentAmount).toFixed(
            2,
          ),
        );
        installment.lateFeeAmountPending = Number(
          (
            Number(installment.lateFeeAmount) - installment.lateFeeAmountPaid
          ).toFixed(2),
        );
        amountLeft = Number((amountLeft - paymentAmount).toFixed(2));

        paidInstallmentIds.push(installment.id);

        // Determinar estado
        const isPrincipalPaid = Number(installment.coutePending ?? 0) <= 0;
        const hasLateFee = installment.lateFeeAmountPending > 0;

        if (isPrincipalPaid && !hasLateFee) {
          // Principal pagado y moras pagadas -> PAID
          installment.status = StatusFinancingInstallments.PAID;
        } else if (hasLateFee) {
          // Aún tiene moras pendientes -> EXPIRED
          installment.status = StatusFinancingInstallments.EXPIRED;
        } else {
          // Principal pendiente, sin moras -> PENDING
          installment.status = StatusFinancingInstallments.PENDING;
        }
      }

      await queryRunner.manager.save(installment);
    }
  }

  /**
   * Calcula el pago de moras y retorna los detalles
   */
  private async calculateLateFeePaymentWithDetails(
    installmentsWithLateFees: FinancingInstallments[],
    remainingAmount: number,
    queryRunner: QueryRunner,
  ): Promise<
    Array<{
      numberCuote: number;
      mode: 'Total' | 'Parcial';
      amountApplied: number;
      pendingAfterPayment: number;
    }>
  > {
    let amountLeft = Number(remainingAmount.toFixed(2));
    const affectedInstallments: Array<{
      numberCuote: number;
      mode: 'Total' | 'Parcial';
      amountApplied: number;
      pendingAfterPayment: number;
    }> = [];

    for (const installment of installmentsWithLateFees) {
      if (amountLeft <= 0) break;

      const lateFeeAmountPending = Number(
        (installment.lateFeeAmountPending ?? 0).toFixed(2),
      );

      if (lateFeeAmountPending > 0) {
        const paymentAmount = Math.min(amountLeft, lateFeeAmountPending);

        // Actualizar valores de mora
        installment.lateFeeAmountPaid = Number(
          (Number(installment.lateFeeAmountPaid || 0) + paymentAmount).toFixed(
            2,
          ),
        );
        installment.lateFeeAmountPending = Number(
          (
            Number(installment.lateFeeAmount) - installment.lateFeeAmountPaid
          ).toFixed(2),
        );
        amountLeft = Number((amountLeft - paymentAmount).toFixed(2));

        const isLateFeePaidCompletely = installment.lateFeeAmountPending <= 0;

        // Determinar estado
        const isPrincipalPaid = Number(installment.coutePending ?? 0) <= 0;

        if (isPrincipalPaid && isLateFeePaidCompletely) {
          installment.status = StatusFinancingInstallments.PAID;
        } else if (!isLateFeePaidCompletely) {
          installment.status = StatusFinancingInstallments.EXPIRED;
        } else {
          installment.status = StatusFinancingInstallments.PENDING;
        }

        affectedInstallments.push({
          numberCuote: installment.numberCuote,
          mode: isLateFeePaidCompletely ? 'Total' : 'Parcial',
          amountApplied: paymentAmount,
          pendingAfterPayment: Number(
            installment.lateFeeAmountPending.toFixed(2),
          ),
        });
      }

      await queryRunner.manager.save(installment);
    }

    return affectedInstallments;
  }
}
