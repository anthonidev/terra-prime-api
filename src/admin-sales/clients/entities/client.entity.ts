import { Reservation } from "src/admin-sales/reservations/entities/reservation.entity";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Lead } from "src/lead/entities/lead.entity";
import { Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('clients')
export class Client extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @OneToOne(() => Lead, (lead) => lead.client)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @OneToMany(() => Sale, (sale) => sale.client)
  sales: Sale[];

  @OneToMany(() => Reservation, (reservation) => reservation.client)
  reservations: Reservation[];

  // TODO: Agregar campos
  
}
