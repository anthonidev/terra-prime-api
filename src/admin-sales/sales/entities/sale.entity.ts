import { Client } from "src/admin-sales/clients/entities/client.entity";
import { SalesType } from "src/admin-sales/sales-type/entities/sales-type.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StatusSale } from "../enums/status-sale.enum";
import { Financing } from "src/admin-sales/financing/entities/financing.entity";
import { Lot } from "src/project/entities/lot.entity";
import { Reservation } from "src/admin-sales/reservations/entities/reservation.entity";

@Entity('sales')
export class Sale extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.sales)
  client: Client;

  @ManyToOne(() => SalesType, (type) => type.sales)
  type: SalesType;

  @ManyToOne(() => Lot, (lot) => lot.sales)
  lot: Lot;

  @OneToOne(
    () => Reservation,
    (reservation) => reservation.sale,
    {nullable: true}
  )
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @ManyToOne(() => User, (user) => user.sales)
  vendor: User;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  initialAmount: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: StatusSale,
    default: StatusSale.PENDING,
  })
  status: StatusSale;

  @OneToOne(() => Financing, (financing) => financing.type)
  financing: Financing;
}
