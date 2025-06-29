import { Client } from "src/admin-sales/clients/entities/client.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StatusSale } from "../enums/status-sale.enum";
import { Financing } from "src/admin-sales/financing/entities/financing.entity";
import { Lot } from "src/project/entities/lot.entity";
import { Reservation } from "src/admin-sales/reservations/entities/reservation.entity";
import { LateTee } from "src/admin-sales/late-fee/entities/lafe-tee.entity";
import { UrbanDevelopment } from "src/admin-sales/urban-development/entities/urban-development.entity";
import { SaleType } from "../enums/sale-type.enum";
import { Guarantor } from "src/admin-sales/guarantors/entities/guarantor.entity";
import { SecondaryClientSale } from "src/admin-sales/secondary-client/entities/secondary-client-sale.entity";
import { SaleWithdrawal } from "src/admin-sales/sales-withdrawal/entities/sale-withdrawal.entity";
import { Participant } from "src/admin-sales/participants/entities/participant.entity";

@Entity('sales')
export class Sale extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.sales)
  client: Client;

  @ManyToOne(() => Guarantor, (guarantor) => guarantor.sales)
  guarantor: Guarantor;

  @Column({
    type: 'enum',
    enum: SaleType,
    nullable: false,
  })
  type: SaleType;

  @OneToOne(() => Financing, (financing) => financing.sale)
  @JoinColumn({ name: 'financing_id' })
  financing: Financing;

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
  totalAmount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  contractDate?: Date;

  @Column({
    type: 'enum',
    enum: StatusSale,
    default: StatusSale.PENDING,
  })
  status: StatusSale;
  
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  radicationPdfUrl?: string;
  // @OneToMany(() => LateTee, (lateFeeTee) => lateFeeTee.sale)
  // lateFeeTee: LateTee[];

  @OneToMany(() => UrbanDevelopment, (urbanDevelopment) => urbanDevelopment.sale)
  urbanDevelopment: UrbanDevelopment[];

  @OneToMany(() => SecondaryClientSale, (secondaryClient) => secondaryClient.sale)
  secondaryClientSales: SecondaryClientSale[];

  @OneToOne(() => SaleWithdrawal, (saleWithdrawal) => saleWithdrawal.sale)
  withdrawal: SaleWithdrawal;

  @ManyToOne(() => Participant, (participant) => participant.liner, { nullable: true })
  liner?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketingSupervisor, { nullable: true })
  telemarketingSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketingConfirmer, { nullable: true })
  telemarketingConfirmer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketer, { nullable: true })
  telemarketer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldManager, { nullable: true })
  fieldManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldSupervisor, { nullable: true })
  fieldSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldSeller, { nullable: true })
  fieldSeller?: Participant;
}
