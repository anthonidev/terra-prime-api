import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { StatusFinancingInstallments } from '../enums/status-financing-installments.enum';

import { Financing } from './financing.entity';

@Entity('financing_installments')
export class FinancingInstallments extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  numberCuote: number | null;

  @Column({
    type: 'numeric',
    nullable: false,
    precision: 10,
    scale: 2,
  })
  couteAmount: number;

  @Column({
    type: 'numeric',
    nullable: false,
    precision: 10,
    scale: 2,
  })
  coutePending: number;

  @Column({
    type: 'numeric',
    nullable: false,
    precision: 10,
    scale: 2,
  })
  coutePaid: number;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  expectedPaymentDate: Date;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  lateFeeAmount: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  lateFeeAmountPending: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  lateFeeAmountPaid: number;

  @ManyToOne(() => Financing, (financing) => financing.financingInstallments, {
    onDelete: 'CASCADE',
  })
  financing: Financing;

  @Column({
    type: 'enum',
    enum: StatusFinancingInstallments,
    default: StatusFinancingInstallments.PENDING,
  })
  status: StatusFinancingInstallments;
}
