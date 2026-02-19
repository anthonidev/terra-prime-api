import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateFinancingDto } from '../dto/create-financing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Financing } from '../entities/financing.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateFinancingInstallmentsDto } from '../dto/create-financing-installments.dto';
import { CombinedAmortizationResponse, CombinedInstallment } from '../interfaces/combined-amortization-response.interface';
import { PaymentsService } from 'src/admin-payments/payments/services/payments.service';
import { TransactionService } from 'src/common/services/transaction.service';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import { CreatePaymentDto } from 'src/admin-payments/payments/dto/create-payment.dto';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { PaymentResponse } from 'src/admin-payments/payments/interfaces/payment-response.interface';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { InterestRateSectionDto } from '../dto/interest-rate-section.dto';

@Injectable()
export class FinancingService {
  private readonly logger = new Logger(FinancingService.name);

  constructor(
    @InjectRepository(Financing)
    private readonly financingRepository: Repository<Financing>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly transactionService: TransactionService,
    @Inject(forwardRef(() => SalesService))
    private readonly salesService: SalesService,
  ) {}
  async create(
    createFinancingDto: CreateFinancingDto,
    queryRunner?: QueryRunner,
    reservationAmount?: number,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Financing)
      : this.financingRepository;
    const { financingInstallments, interestRateSections, ...restData } = createFinancingDto;

    // Calcular promedio ponderado de tasas y guardar secciones
    const computedInterestRate = interestRateSections
      ? this.calculateWeightedAverageRate(interestRateSections)
      : (restData.interestRate ?? 0);

    // Calcular el monto pendiente de la inicial (la reserva se registrará como pago al aprobarse)
    const initialToPay = Number(Number(restData.initialAmount).toFixed(2));

    const financing = repository.create({
      ...restData,
      interestRate: computedInterestRate,
      interestRateSections: interestRateSections ?? null,
      initialAmountPaid: 0,
      initialAmountPending: initialToPay,
      financingInstallments: financingInstallments.map((financingInstallment, index) => {
        const { couteAmount, expectedPaymentDate } = financingInstallment;
        return {
          numberCuote: index + 1,
          couteAmount: couteAmount,
          coutePending: couteAmount,
          coutePaid: 0,
          expectedPaymentDate: expectedPaymentDate,
        };
      }),
    });
    return await repository.save(financing);
  }

  private calculateWeightedAverageRate(sections: InterestRateSectionDto[]): number {
    const totalInstallments = Math.max(...sections.map(s => s.endInstallment));
    const weightedSum = sections.reduce((sum, section) => {
      const count = section.endInstallment - section.startInstallment + 1;
      return sum + section.interestRate * count;
    }, 0);
    return parseFloat((weightedSum / totalInstallments).toFixed(6));
  }

  generateAmortizationTable(
    totalAmount: number,
    initialAmount: number,
    reservationAmount: number,
    interestRateSections: InterestRateSectionDto[] | number,
    numberOfPayments?: number,
    firstPaymentDate: string | Date = new Date(),
    includeDecimals: boolean = true,
  ): CreateFinancingInstallmentsDto[] {

    // Compatibilidad: si se pasa interestRate como número (legado), convertir a sección única
    let sections: InterestRateSectionDto[];
    let totalInstallments: number;

    if (typeof interestRateSections === 'number') {
      // Llamada legada con tasa única y numberOfPayments
      totalInstallments = numberOfPayments!;
      sections = [{ startInstallment: 1, endInstallment: totalInstallments, interestRate: interestRateSections }];
    } else {
      sections = [...interestRateSections].sort((a, b) => a.startInstallment - b.startInstallment);
      totalInstallments = Math.max(...sections.map(s => s.endInstallment));
    }

    const principal = totalAmount - initialAmount;
    const installments: CreateFinancingInstallmentsDto[] = [];

    // Parsear la fecha de inicio
    let initialYear: number;
    let initialMonth: number; // 0-indexed
    let initialDay: number;

    if (typeof firstPaymentDate === 'string') {
      const parts = firstPaymentDate.split('T')[0].split('-');
      initialYear = parseInt(parts[0], 10);
      initialMonth = parseInt(parts[1], 10) - 1;
      initialDay = parseInt(parts[2], 10);
    } else {
      initialYear = firstPaymentDate.getFullYear();
      initialMonth = firstPaymentDate.getMonth();
      initialDay = firstPaymentDate.getDate();
    }
    const originalDay = initialDay;

    let currentBalance = principal;
    let installmentIndex = 0; // índice global de cuota (0-based)

    for (const section of sections) {
      const sectionCount = section.endInstallment - section.startInstallment + 1;
      const remainingInstallments = totalInstallments - section.startInstallment + 1;
      const ratePerPeriod = section.interestRate / 100;

      let sectionPayment: number;
      if (ratePerPeriod === 0) {
        sectionPayment = currentBalance / remainingInstallments;
      } else {
        sectionPayment =
          (currentBalance * ratePerPeriod) /
          (1 - Math.pow(1 + ratePerPeriod, -remainingInstallments));
      }

      for (let j = 0; j < sectionCount; j++) {
        const i = installmentIndex;

        // Calcular fecha
        const paymentDate = new Date(initialYear, initialMonth + i, originalDay);
        const targetMonth = (initialMonth + i) % 12;
        const targetYear = initialYear + Math.floor((initialMonth + i) / 12);
        if (
          paymentDate.getMonth() !== targetMonth ||
          paymentDate.getFullYear() !== targetYear ||
          paymentDate.getDate() !== originalDay
        ) {
          const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
          paymentDate.setDate(lastDayOfTargetMonth);
          paymentDate.setFullYear(targetYear);
          paymentDate.setMonth(targetMonth);
        }
        const year = paymentDate.getFullYear();
        const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = paymentDate.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const couteAmount = includeDecimals
          ? parseFloat(sectionPayment.toFixed(2))
          : Math.round(sectionPayment);

        installments.push({ couteAmount, expectedPaymentDate: formattedDate });

        // Actualizar saldo
        const interest = currentBalance * ratePerPeriod;
        const principalPaid = sectionPayment - interest;
        currentBalance -= principalPaid;

        installmentIndex++;
      }
    }

    // Ajuste de redondeo en la última cuota del array completo
    if (installments.length > 0) {
      // El total esperado = principal (sin interés usamos suma directa)
      // Para el ajuste de redondeo: ajustamos si el saldo residual es muy pequeño
      if (Math.abs(currentBalance) > 0.001 && Math.abs(currentBalance) < 1.5) {
        const last = installments[installments.length - 1];
        last.couteAmount = parseFloat((last.couteAmount + currentBalance).toFixed(2));
      }
    }

    return installments;
  }

  generateCombinedAmortizationTable(
    totalAmount: number,
    initialAmount: number,
    reservationAmount: number,
    interestRateSections: InterestRateSectionDto[] | number,
    numberOfPayments?: number,
    firstPaymentDate: string | Date = new Date(),
    includeDecimals: boolean = true,
    totalAmountHu?: number,
    numberOfPaymentsHu?: number,
    firstPaymentDateHu?: string | Date,
  ): CombinedAmortizationResponse {
    // 1. Generar cuotas del lote
    const lotInstallments = this.generateAmortizationTable(
      totalAmount,
      initialAmount,
      reservationAmount,
      interestRateSections,
      numberOfPayments,
      firstPaymentDate,
      includeDecimals,
    );

    // 2. Generar cuotas de HU si existen los parámetros
    let huInstallments: CreateFinancingInstallmentsDto[] = [];
    if (totalAmountHu && numberOfPaymentsHu && firstPaymentDateHu) {
      // HU no tiene inicial ni interés
      const huSections: InterestRateSectionDto[] = [
        { startInstallment: 1, endInstallment: numberOfPaymentsHu, interestRate: 0 },
      ];
      huInstallments = this.generateAmortizationTable(
        totalAmountHu,
        0, // Sin inicial
        0, // Sin reserva
        huSections,
        undefined,
        firstPaymentDateHu,
        includeDecimals,
      );
    }

    // 3. Combinar ambos arrays sincronizando por fecha
    const combinedInstallments: CombinedInstallment[] = [];

    // Crear un mapa para acceder rápidamente a las cuotas de HU por fecha
    const huMap = new Map<string, { amount: number; number: number }>();
    huInstallments.forEach((hu, index) => {
      huMap.set(hu.expectedPaymentDate, { amount: hu.couteAmount, number: index + 1 });
    });

    // Crear un mapa para las cuotas de lote
    const lotMap = new Map<string, { amount: number; number: number }>();
    lotInstallments.forEach((lot, index) => {
      lotMap.set(lot.expectedPaymentDate, { amount: lot.couteAmount, number: index + 1 });
    });

    // Obtener todas las fechas únicas ordenadas
    const allDates = new Set<string>([
      ...lotInstallments.map(i => i.expectedPaymentDate),
      ...huInstallments.map(i => i.expectedPaymentDate),
    ]);
    const sortedDates = Array.from(allDates).sort();

    // Para cada fecha, crear el installment combinado
    for (const date of sortedDates) {
      const lotData = lotMap.get(date);
      const huData = huMap.get(date);

      const lotInstallmentAmount = lotData ? lotData.amount : null;
      const lotInstallmentNumber = lotData ? lotData.number : null;
      const huInstallmentAmount = huData ? huData.amount : null;
      const huInstallmentNumber = huData ? huData.number : null;

      const totalInstallmentAmount = (lotInstallmentAmount || 0) + (huInstallmentAmount || 0);

      combinedInstallments.push({
        lotInstallmentAmount,
        lotInstallmentNumber,
        huInstallmentAmount,
        huInstallmentNumber,
        expectedPaymentDate: date,
        totalInstallmentAmount: parseFloat(totalInstallmentAmount.toFixed(2)),
      });
    }

    // 4. Calcular metadata
    const lotTotalAmount = lotInstallments.reduce((sum, inst) => sum + inst.couteAmount, 0);
    const huTotalAmount = huInstallments.reduce((sum, inst) => sum + inst.couteAmount, 0);

    const meta = {
      lotInstallmentsCount: lotInstallments.length,
      lotTotalAmount: parseFloat(lotTotalAmount.toFixed(2)),
      huInstallmentsCount: huInstallments.length,
      huTotalAmount: parseFloat(huTotalAmount.toFixed(2)),
      totalInstallmentsCount: combinedInstallments.length,
      totalAmount: parseFloat((lotTotalAmount + huTotalAmount).toFixed(2)),
    };

    return {
      installments: combinedInstallments,
      meta,
    };
  }

  // Internal helpers methods
  async findOneById(id: string): Promise<Financing> {
    const financing = await this.financingRepository.findOne({
      where: { id },
      relations: ['sale', 'urbanDevelopment'],
    });
    if (!financing)
      throw new NotFoundException(`El financiamiento con ID ${id} no se encuentra registrado`);
    return financing;
  }

  async findBySaleId(id: string): Promise<Financing> {
    const financing = await this.financingRepository.findOne({
      where: { sale: { id } },
      relations: ['sale'],
    });
    // if (!financing)
    //   throw new NotFoundException(`El financiamiento con ID de venta ${id} no se encuentra registrado`);
    return financing;
  }

  async findOneWithPayments(id: string): Promise<Financing> {
    return await this.financingRepository.findOne({
      where: { id },
      relations: [
        'sale',
        'sale.client',
        'sale.lot',
        'sale.lot.block',
        'sale.lot.block.stage',
        'sale.lot.block.stage.project'
      ],
    });
  }

  async update(
    id: string,
    updateData: Partial<CreateFinancingDto>,
    queryRunner?: QueryRunner,
  ): Promise<Financing> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Financing)
      : this.financingRepository;

    const financing = await repository.findOne({
      where: { id },
      relations: ['financingInstallments'],
    });

    if (!financing) {
      throw new NotFoundException(
        `El financiamiento con ID ${id} no se encuentra registrado`,
      );
    }

    const { financingInstallments, interestRateSections, ...restData } = updateData;

    // Calcular promedio ponderado si se actualizan secciones
    if (interestRateSections) {
      restData.interestRate = this.calculateWeightedAverageRate(interestRateSections);
    }

    // Actualizar campos básicos del financiamiento
    const fieldsToUpdate: Record<string, any> = { ...restData };
    if (interestRateSections !== undefined) {
      fieldsToUpdate.interestRateSections = interestRateSections;
    }
    if (Object.keys(fieldsToUpdate).length > 0) {
      await repository.update(id, fieldsToUpdate);
    }

    // Si se proporcionan nuevas cuotas, eliminar las antiguas y crear las nuevas
    if (financingInstallments && financingInstallments.length > 0) {
      const installmentsRepository = queryRunner
        ? queryRunner.manager.getRepository('FinancingInstallments')
        : this.financingRepository.manager.getRepository('FinancingInstallments');

      // Eliminar cuotas existentes
      if (financing.financingInstallments && financing.financingInstallments.length > 0) {
        await installmentsRepository.delete({
          financing: { id },
        });
      }

      // Crear nuevas cuotas
      const newInstallments = financingInstallments.map((installment, index) => ({
        ...installment,
        numberCuote: index + 1,
        coutePending: installment.couteAmount,
        coutePaid: 0,
        financing: { id },
      }));

      await installmentsRepository.save(newInstallments);
    }

    // Retornar el financiamiento actualizado
    return await repository.findOne({
      where: { id },
      relations: ['financingInstallments'],
    });
  }

  async remove(id: string, queryRunner?: QueryRunner): Promise<void> {
    const financingRepository = queryRunner
      ? queryRunner.manager.getRepository(Financing)
      : this.financingRepository;
    const financing = await financingRepository.findOne({
      where: { id },
      relations: ['financingInstallments'],
    });
    if (!financing)
      throw new NotFoundException(
        `El financiamiento con ID ${id} no se encuentra registrado`,
      );

    // Eliminar manualmente las cuotas primero para evitar conflictos de FK
    if (financing.financingInstallments && financing.financingInstallments.length > 0) {
      const installmentsRepository = queryRunner
        ? queryRunner.manager.getRepository('FinancingInstallments')
        : this.financingRepository.manager.getRepository('FinancingInstallments');
      await installmentsRepository.delete({
        financing: { id },
      });
    }

    // Ahora eliminar el financing
    await financingRepository.remove(financing);
  }

  // ============================================================
  // PAGO DE CUOTA INICIAL AUTO-APROBADO (ADM)
  // ============================================================

  async payInitialAmountAutoApproved(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
    dateOperation: string,
    numberTicket?: string,
    observation?: string,
  ): Promise<PaymentResponse> {
    try {
      this.logger.log(
        `Iniciando pago auto-aprobado de cuota inicial - financingId: ${financingId}, amountPaid: ${amountPaid}, userId: ${userId}`,
      );

      if (amountPaid <= 0)
        throw new BadRequestException('El monto a pagar debe ser mayor a cero.');

      await this.paymentsService.isValidPaymentConfig(
        'financing',
        financingId,
        true,
      );

      const financing = await this.financingRepository.findOne({
        where: { id: financingId },
        relations: ['sale'],
      });

      if (!financing)
        throw new NotFoundException(
          `El financiamiento con ID ${financingId} no se encuentra registrado`,
        );

      const sale = await this.salesService.findOneByIdFinancing(financingId);

      // Calcular el pendiente real de la cuota inicial (la reserva ya se refleja en initialAmountPaid)
      const initialToPay = Number(
        Number(financing.initialAmount).toFixed(2),
      );
      const currentPaid = Number(financing.initialAmountPaid || 0);
      const realPending = Number((initialToPay - currentPaid).toFixed(2));

      if (realPending <= 0)
        throw new BadRequestException(
          'La cuota inicial ya se encuentra completamente pagada.',
        );

      if (amountPaid > realPending)
        throw new BadRequestException(
          `El monto a pagar (${amountPaid.toFixed(2)}) excede el monto pendiente de la cuota inicial (${realPending.toFixed(2)}).`,
        );

      return await this.transactionService.runInTransaction(
        async (queryRunner) => {
          const createPaymentDto: CreatePaymentDto = {
            methodPayment: MethodPayment.VOUCHER,
            amount: amountPaid,
            relatedEntityType: 'financing',
            relatedEntityId: financingId,
            metadata: {
              'Concepto de pago':
                'Pago de cuota inicial de financiación (Auto-aprobado)',
              'Monto inicial total': financing.initialAmount,
              'Monto de reserva descontado': sale.reservationAmount || 0,
              'Monto pendiente antes de este pago': realPending,
              'Monto pagado en esta operación': amountPaid,
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
    } catch (error) {
      this.logger.error(
        `Error en pago auto-aprobado de cuota inicial - financingId: ${financingId}, amountPaid: ${amountPaid}, userId: ${userId}`,
        error.stack,
      );
      throw error;
    }
  }
}
