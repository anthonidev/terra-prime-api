import { Reservation } from 'src/admin-sales/reservations/entities/reservation.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
