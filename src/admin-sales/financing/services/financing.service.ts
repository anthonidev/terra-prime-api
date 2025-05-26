import { Injectable } from '@nestjs/common';
import { CreateFinancingDto } from '../dto/create-financing.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Financing } from '../entities/financing.entity';
import { QueryRunner, Repository } from 'typeorm';
import { CreateFinancingInstallmentsDto } from '../dto/create-financing-installments.dto';

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
    principal: number,
    interestRate: number,
    numberOfPayments: number,
    firstPaymentDate: string | Date,
    includeDecimals: boolean = true,
  ): CreateFinancingInstallmentsDto[] {

    const installments: CreateFinancingInstallmentsDto[] = [];

    if (numberOfPayments <= 0) {
      console.log('Número de pagos <= 0. Retornando array vacío.');
      return [];
    }

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
    // --- Lógica de ajuste final en la última cuota (SOLO si no incluye decimales) ---
    if (!includeDecimals && numberOfPayments > 0) {
        let sumOfCalculatedInstallments = installments.reduce((sum, inst) => sum + inst.couteAmount, 0);
        let totalExpectedPaymentWithFullDecimals = calculatedMonthlyPayment * numberOfPayments;

        let adjustmentNeeded = totalExpectedPaymentWithFullDecimals - sumOfCalculatedInstallments;

        if (Math.abs(adjustmentNeeded) > 0.005) {
            let lastCouteAmount = installments[numberOfPayments - 1].couteAmount;
            lastCouteAmount += adjustmentNeeded;
            installments[numberOfPayments - 1].couteAmount = Math.round(lastCouteAmount);
        } else {
            installments[numberOfPayments - 1].couteAmount = Math.round(installments[numberOfPayments - 1].couteAmount);
        }
    }
    return installments;
  }
}
