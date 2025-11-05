import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFinancingDto } from '../dto/create-financing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Financing } from '../entities/financing.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateFinancingInstallmentsDto } from '../dto/create-financing-installments.dto';
import { CombinedAmortizationResponse, CombinedInstallment } from '../interfaces/combined-amortization-response.interface';

@Injectable()
export class FinancingService {
  constructor(
    @InjectRepository(Financing)
    private readonly financingRepository: Repository<Financing>,
  ) {}
  async create(
    createFinancingDto: CreateFinancingDto,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Financing)
      : this.financingRepository;
    const { financingInstallments, ...restData } = createFinancingDto;
    const financing = repository.create({
      ...restData,
      financingInstallments: financingInstallments.map((financingInstallment) => {
        const { couteAmount, expectedPaymentDate } = financingInstallment;
        return {
          couteAmount: couteAmount,
          coutePending: couteAmount,
          coutePaid: 0,
          expectedPaymentDate: expectedPaymentDate,
        };
      }),
    });
    return await repository.save(financing);
  }

  generateAmortizationTable(
    totalAmount: number,
    initialAmount: number,
    reservationAmount: number,
    interestRate: number,
    numberOfPayments: number,
    firstPaymentDate: string | Date,
    includeDecimals: boolean = true,
  ): CreateFinancingInstallmentsDto[] {

    const principal = totalAmount - initialAmount - reservationAmount;

    const installments: CreateFinancingInstallmentsDto[] = [];

    const ratePerPeriod = interestRate / 100;

    let calculatedMonthlyPayment: number;

    if (ratePerPeriod === 0) {
      calculatedMonthlyPayment = principal / numberOfPayments;
    } else {
      calculatedMonthlyPayment =
        (principal * ratePerPeriod) /
        (1 - Math.pow(1 + ratePerPeriod, -numberOfPayments));
    }

    // --- PARSEAR LA FECHA DE ENTRADA MANUALMENTE (MANTENER ESTO) ---
    let initialYear: number;
    let initialMonth: number; // 0-indexed
    let initialDay: number;

    if (typeof firstPaymentDate === 'string') {
        const parts = firstPaymentDate.split('T')[0].split('-');
        initialYear = parseInt(parts[0], 10);
        initialMonth = parseInt(parts[1], 10) - 1; // Meses son 0-indexados en JS
        initialDay = parseInt(parts[2], 10);
    } else { // Si ya es un objeto Date
        initialYear = firstPaymentDate.getFullYear();
        initialMonth = firstPaymentDate.getMonth();
        initialDay = firstPaymentDate.getDate();
    }
    // Este es el día que intentaremos mantener
    const originalDay = initialDay;

    for (let i = 0; i < numberOfPayments; i++) {
      let currentCouteAmount: number;

      if (includeDecimals) {
        currentCouteAmount = parseFloat(calculatedMonthlyPayment.toFixed(2));
      } else {
        currentCouteAmount = Math.round(calculatedMonthlyPayment);
      }

      const paymentDate = new Date(initialYear, initialMonth + i, originalDay);

      const targetMonth = (initialMonth + i) % 12; // El mes esperado (0-11)
      const targetYear = initialYear + Math.floor((initialMonth + i) / 12); // El año esperado

      if (paymentDate.getMonth() !== targetMonth || paymentDate.getFullYear() !== targetYear || paymentDate.getDate() !== originalDay) {
          const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
          paymentDate.setDate(lastDayOfTargetMonth);
          paymentDate.setFullYear(targetYear); // Asegurarse del año correcto
          paymentDate.setMonth(targetMonth);   // Asegurarse del mes correcto
      }
      // Formatear la fecha a YYYY-MM-DD
      const year = paymentDate.getFullYear();
      const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = paymentDate.getDate().toString().padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      installments.push({
        couteAmount: currentCouteAmount,
        expectedPaymentDate: formattedDate,
      });
    }

    // --- Lógica de ajuste final en la última cuota ---
    // Ajustar solo errores de redondeo, no cambiar el monto total esperado
    if (numberOfPayments > 0) {
      const sumOfCalculatedInstallments = installments.reduce((sum, inst) => sum + inst.couteAmount, 0);

      // El monto total esperado es la cuota teórica multiplicada por el número de pagos
      const expectedTotal = calculatedMonthlyPayment * numberOfPayments;

      const adjustmentNeeded = expectedTotal - sumOfCalculatedInstallments;

      // Si hay diferencia por redondeos (pequeña), ajustar la última cuota
      if (Math.abs(adjustmentNeeded) > 0.001) {
        const lastCouteAmount = installments[numberOfPayments - 1].couteAmount;
        installments[numberOfPayments - 1].couteAmount = parseFloat((lastCouteAmount + adjustmentNeeded).toFixed(2));
      }
    }

    return installments;
  }

  generateCombinedAmortizationTable(
    totalAmount: number,
    initialAmount: number,
    reservationAmount: number,
    interestRate: number,
    numberOfPayments: number,
    firstPaymentDate: string | Date,
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
      interestRate,
      numberOfPayments,
      firstPaymentDate,
      includeDecimals,
    );

    // 2. Generar cuotas de HU si existen los parámetros
    let huInstallments: CreateFinancingInstallmentsDto[] = [];
    if (totalAmountHu && numberOfPaymentsHu && firstPaymentDateHu) {
      // HU no tiene inicial ni interés
      huInstallments = this.generateAmortizationTable(
        totalAmountHu,
        0, // Sin inicial
        0, // Sin reserva
        0, // Sin interés
        numberOfPaymentsHu,
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

    const { financingInstallments, ...restData } = updateData;

    // Actualizar campos básicos del financiamiento
    if (Object.keys(restData).length > 0) {
      await repository.update(id, restData);
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
      const newInstallments = financingInstallments.map((installment) => ({
        ...installment,
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
}
