import { Client } from "src/admin-sales/clients/entities/client.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Lot } from "src/project/entities/lot.entity";
import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StatusReservation } from "../enums/status-reservation.enum";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { User } from "src/user/entities/user.entity";

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

  // @OneToOne(() => Sale, (sale) => sale.reservation)
  // sale: Sale;

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
