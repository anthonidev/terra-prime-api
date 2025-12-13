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
import { Lot } from '../../../../../inventory/lots/entities/lot.entity';
import { LeadVisit } from '../../../../leads/entities/lead-visit.entity';
import { Client } from '../../../stakeholders/clients/entities/client.entity';
import { Guarantor } from '../../../stakeholders/guarantors/entities/guarantor.entity';
import { Participant } from '../../../stakeholders/participants/entities/participant.entity';
import { SecondaryClientSale } from '../../../stakeholders/secondary-client/entities/secondary-client-sale.entity';
import { Financing } from '../../../terms/financing/entities/financing.entity';
import { UrbanDevelopment } from '../../../terms/urban-development/entities/urban-development.entity';
import { SaleWithdrawal } from '../../withdrawals/entities/sale-withdrawal.entity';
import { SaleType } from '../enums/sale-type.enum';
import { StatusSale } from '../enums/status-sale.enum';

@Entity('sales')
export class Sale extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.sales)
  client: Client;

  @ManyToOne(() => LeadVisit, { nullable: true })
  @JoinColumn({ name: 'lead_visit_id' })
  leadVisit?: LeadVisit;

  @ManyToOne(() => Guarantor, (guarantor) => guarantor.sales, { nullable: true })
  guarantor?: Guarantor;

  @Column({
    type: 'enum',
    enum: SaleType,
    nullable: false,
  })
  type: SaleType;

  @OneToOne(() => Financing, (financing) => financing.sale, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'financing_id' })
  financing?: Financing;

  @ManyToOne(() => Lot, (lot) => lot.sales)
  lot: Lot;

  @ManyToOne(() => User, (user) => user.sales)
  vendor: User;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  totalAmount: number;

  // ========== CAMPOS DE RESERVA INTEGRADOS ==========

  @Column({
    type: 'boolean',
    default: false,
  })
  fromReservation?: boolean;

  @Column({
    type: 'decimal',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  reservationAmount?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  reservationAmountPaid: number;

  @Column({
    type: 'decimal',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  reservationAmountPending?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalAmountPaid: number;

  @Column({
    type: 'decimal',
    nullable: true,
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalAmountPending?: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  maximumHoldPeriod?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  cancellationReason?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  contractDate?: Date;

  @Column({
    type: 'enum',
    enum: StatusSale,
    default: StatusSale.RESERVATION_PENDING,
  })
  status: StatusSale;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  radicationPdfUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  paymentAcordPdfUrl?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'boolean', default: true })
  applyLateFee: boolean;

  @OneToOne(() => UrbanDevelopment, (urbanDevelopment) => urbanDevelopment.sale, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  urbanDevelopment?: UrbanDevelopment;

  @OneToMany(() => SecondaryClientSale, (secondaryClient) => secondaryClient.sale)
  secondaryClientSales: SecondaryClientSale[];

  @OneToOne(() => SaleWithdrawal, (saleWithdrawal) => saleWithdrawal.sale, { nullable: true })
  withdrawal?: SaleWithdrawal;

  @ManyToOne(() => Participant, (participant) => participant.liner, { nullable: true })
  liner?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketingSupervisor, {
    nullable: true,
  })
  telemarketingSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketingConfirmer, {
    nullable: true,
  })
  telemarketingConfirmer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.telemarketer, { nullable: true })
  telemarketer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldManager, { nullable: true })
  fieldManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldSupervisor, { nullable: true })
  fieldSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.fieldSeller, { nullable: true })
  fieldSeller?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.salesManager, { nullable: true })
  salesManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.salesGeneralManager, {
    nullable: true,
  })
  salesGeneralManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.postSale, { nullable: true })
  postSale?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.closer, { nullable: true })
  closer?: Participant;
}
