import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Financing } from "./financing.entity";
import { StatusFinancingInstallments } from "../enums/status-financing-installments.enum";
import { Timestamped } from "src/common/entities/timestamped.entity";

@Entity('financing_installments')
export class FinancingInstallments extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @ManyToOne(
    () => Financing,
    (financing) => financing.financingInstallments,
    { onDelete: 'CASCADE' }
  )
  financing: Financing;

  @Column({
    type: 'enum',
    enum: StatusFinancingInstallments,
    default: StatusFinancingInstallments.PENDING,
  })
  status: StatusFinancingInstallments
}