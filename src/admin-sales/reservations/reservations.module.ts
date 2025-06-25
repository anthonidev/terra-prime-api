import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { CommonModule } from 'src/common/common.module';
import { ClientsModule } from '../clients/clients.module';
import { ProjectModule } from 'src/project/project.module';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), CommonModule, ClientsModule, ProjectModule, UsersModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService, TypeOrmModule],
})
export class ReservationsModule {}
