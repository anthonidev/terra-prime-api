import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadService } from 'src/lead/services/lead.service';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { FinancingInstallmentsService } from 'src/admin-sales/financing/services/financing-installments.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly leadService: LeadService,
    private readonly salesService: SalesService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
  ) {}

  @Cron('0 3 * * *', {
    name: 'daily-lead-cleanup',
    timeZone: 'America/Lima',
  })
  async handleWeeklyVolumeCut() {
    this.logger.log('Iniciando tarea programada: Corte diario de leads');
    try {
      await this.leadService.updateIsOfficeAndAssignVendor();
      this.logger.log('Tarea programada completada: Corte diario de leads');
    } catch (error) {
      this.logger.error(
        `Error en tarea programada: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('10 0 * * *', {
    name: 'daily-expired-reservations',
    timeZone: 'America/Lima',
  })
  async handleExpiredReservations() {
    this.logger.log(
      'Iniciando tarea programada: Corte diario de reservas expiradas',
    );
    try {
      await this.salesService.processExpiredReservations();
      this.logger.log(
        'Tarea programada completada: Corte diario de reservas expiradas',
      );
    } catch (error) {
      this.logger.error(
        `Error en tarea programada de reservas expiradas: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 1 * * *', {
    name: 'daily-late-fee-increase',
    timeZone: 'America/Lima',
  })
  async handleLateFeeIncrease() {
    this.logger.log(
      'Iniciando tarea programada: Corte diario de aumento de mora',
    );
    try {
      await this.financingInstallmentsService.increaseLateFeesForOverdueInstallments();
      this.logger.log(
        'Tarea programada completada: Corte diario de aumento de mora',
      );
    } catch (error) {
      this.logger.error(
        `Error en tarea programada de aumento de mora: ${error.message}`,
        error.stack,
      );
    }
  }
}
