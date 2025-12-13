import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { User } from '../../../../../iam/users/entities/user.entity';
import { Lead } from '../../../../leads/entities/lead.entity';
import { Sale } from '../../../transaction/contract/entities/sale.entity';
import { Reservation } from '../../../transaction/reservation/entities/reservation.entity';

@Entity('clients')
export class Client extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Lead, (lead) => lead.client, { eager: true })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @OneToMany(() => Sale, (sale) => sale.client)
  sales: Sale[];

  @OneToMany(() => Reservation, (reservation) => reservation.client)
  reservations: Reservation[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: true,
  })
  address: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
