import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { Sale } from '../../../transaction/contract/entities/sale.entity';
import { UrbanDevelopment } from '../../urban-development/entities/urban-development.entity';
import { FinancingType } from '../enums/financing-type.enum';

import { FinancingInstallments } from './financing-installments.entity';

@Entity('financing')
export class Financing extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FinancingType,
    nullable: false,
  })
  financingType: FinancingType;

  @OneToOne(() => Sale, (sale) => sale.financing, { onDelete: 'CASCADE' })
  sale: Sale;

  @OneToOne(() => UrbanDevelopment, (urbanDevelopment) => urbanDevelopment.financing, {
    onDelete: 'CASCADE',
  })
  urbanDevelopment: UrbanDevelopment;

  @OneToMany(() => FinancingInstallments, (installments) => installments.financing, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  financingInstallments: FinancingInstallments[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  initialAmount: number;

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
  initialAmountPaid: number;

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
  initialAmountPending?: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  interestRate: number;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  quantityCoutes: number;
}
