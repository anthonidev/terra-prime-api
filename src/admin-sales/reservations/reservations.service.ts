import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusReservation } from './enums/status-reservation.enum';
import { ClientsService } from '../clients/clients.service';
import { LotService } from 'src/project/services/lot.service';
import { TransactionService } from 'src/common/services/transaction.service';
import { LotStatus } from 'src/project/entities/lot.entity';
import { ReservationResponse } from './interfaces/reservation-response.interface';
import { formatReservationResponse } from './helpers/format-reservation-response.helper';
import { UsersService } from 'src/user/user.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly clientService: ClientsService,
    private readonly lotService: LotService,
    private readonly transactionService: TransactionService,
    private readonly userService: UsersService,
  ) {}

  async getAmountReservation(reservationId: string): Promise<number> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      select: ['amount'],
    });
    return reservation.amount;
  }

  async isValidReservation(reservationId: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, status: StatusReservation.PENDING },
      relations: ['client', 'lot'],
    });
    if (!reservation)
      throw new NotFoundException(`La reserva con ID ${reservationId} no se encuentra disponible`);
    return reservation;
  }

  async updateStatusReservation(reservationId: string, status: StatusReservation): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });
    if (!reservation)
      throw new NotFoundException(`La reserva con ID ${reservationId} no se encuentra registrada`);
    reservation.status = status;
    await this.reservationRepository.save(reservation);
    return reservation;
  }

  async create(
    createReservationDto: CreateReservationDto,
    userId: string,
  ): Promise<ReservationResponse> {
    const { amount, clientId, lotId, maximumHoldPeriod } = createReservationDto;
    const [client, lot, vendor] = await Promise.all([
      this.clientService.isValidClient(clientId),
      this.lotService.isLotValidForSale(lotId),
      this.userService.findOne(userId),
    ]);
    if ( lot.lotPrice < amount)
      throw new BadRequestException(`El monto de reserva no puede ser mayor al precio del lote`);

    const reservationSaved = await this.transactionService.runInTransaction(async (queryRunner) => {
      const reservation = this.reservationRepository.create({
        amount,
        client,
        lot,
        maximumHoldPeriod,
        vendor,
        status: StatusReservation.PENDING,
      });
      const reservationSaved = await queryRunner.manager.save(reservation);
      await this.lotService.updateStatus(lot.id, LotStatus.RESERVED, queryRunner);
      return reservationSaved;
    });
    return formatReservationResponse(reservationSaved);
  }

  async findOneWithPayments(id: string): Promise<Reservation> {
    return await this.reservationRepository.findOne({
      where: { id },
      relations: ['client', 'lot'],
    });
  }
}
