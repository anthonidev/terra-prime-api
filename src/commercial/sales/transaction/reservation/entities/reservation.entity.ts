import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { User } from '../../../../../iam/users/entities/user.entity';
import { Lot } from '../../../../../inventory/lots/entities/lot.entity';
import { Client } from '../../../stakeholders/clients/entities/client.entity';
import { StatusReservation } from '../enums/status-reservation.enum';

@Entity()
export class Reservation extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.reservations)
  vendor: User;

  @ManyToOne(() => Client, (client) => client.reservations)
  client: Client;

  @ManyToOne(() => Lot, (lot) => lot.reservations)
  lot: Lot;

  @Column({
    type: 'decimal',
    nullable: false,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  maximumHoldPeriod: number;

  @Column({
    type: 'enum',
    enum: StatusReservation,
    default: StatusReservation.PENDING,
  })
  status: StatusReservation;
}
