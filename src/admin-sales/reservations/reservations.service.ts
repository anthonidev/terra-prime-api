import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusReservation } from './enums/status-reservation.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
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

  create(createReservationDto: CreateReservationDto) {
    return 'This action adds a new reservation';
  }

  findAll() {
    return `This action returns all reservations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservation`;
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
