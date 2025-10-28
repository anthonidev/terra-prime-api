import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CutsService } from './cuts.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private readonly cutsService: CutsService) {}

  @Cron('0 3 * * *', {
    name: 'daily-lead-cleanup',
    timeZone: 'America/Lima',
  })
  async handleWeeklyVolumeCut() {
    this.logger.log('Iniciando tarea programada: Corte diario de leads');
    try {
      await this.cutsService.executeCut('DAILY_LEADS_CLEANUP');
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
    this.logger.log('Iniciando tarea programada: Corte diario de reservas expiradas');
    try {
      await this.cutsService.executeCut('DAILY_EXPIRED_RESERVATIONS');
      this.logger.log('Tarea programada completada: Corte diario de reservas expiradas');
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
    this.logger.log('Iniciando tarea programada: Corte diario de aumento de mora');
    try {
      await this.cutsService.executeCut('DAILY_LATE_FEE_INCREASE');
      this.logger.log('Tarea programada completada: Corte diario de aumento de mora');
    } catch (error) {
      this.logger.error(
        `Error en tarea programada de aumento de mora: ${error.message}`,
        error.stack,
      );
    }
  }
}
