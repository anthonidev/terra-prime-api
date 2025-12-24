import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import { Financing } from './financing.entity';

@Entity('financing_amendment_history')
export class FinancingAmendmentHistory extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  fileUrl: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  saleId: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  financingId: string;

  @ManyToOne(() => Financing, { onDelete: 'CASCADE' })
  financing: Financing;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalCouteAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalPaid: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalPending: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalLateFee: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalLateFeePending: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalLateFeePaid: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  additionalAmount: number;

  @Column({
    type: 'int',
    default: 0,
  })
  previousInstallmentsCount: number;

  @Column({
    type: 'int',
    default: 0,
  })
  newInstallmentsCount: number;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  previousInstallments: any;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  observation: string;
}
