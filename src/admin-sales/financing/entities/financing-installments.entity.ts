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

  @ManyToOne(() => Financing, (financing) => financing.financingInstallments)
  financing: Financing;

  @Column({
    type: 'enum',
    enum: StatusFinancingInstallments,
    default: StatusFinancingInstallments.PENDING,
  })
  status: StatusFinancingInstallments
}