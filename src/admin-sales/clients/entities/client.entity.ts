import { Guarantor } from "src/admin-sales/guarantors/entities/guarantor.entity";
import { Reservation } from "src/admin-sales/reservations/entities/reservation.entity";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Lead } from "src/lead/entities/lead.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";

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

  @ManyToOne(() => Guarantor, (guarantor) => guarantor.clients)
  guarantor: Guarantor;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: false
  })
  address: string;

}
