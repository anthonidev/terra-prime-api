import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { Sale } from '../../../transaction/contract/entities/sale.entity';
import { Financing } from '../../financing/entities/financing.entity';
import { StatusUrbanDevelopment } from '../enums/status-urban-development.enum';

@Entity('urban_development')
export class UrbanDevelopment extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Financing, (financing) => financing.urbanDevelopment)
  @JoinColumn({ name: 'financing_id' })
  financing: Financing;

  @OneToOne(() => Sale, (sale) => sale.urbanDevelopment, { cascade: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  amount: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  initialAmount: number;

  @Column({
    type: 'enum',
    enum: StatusUrbanDevelopment,
    default: StatusUrbanDevelopment.PENDING,
  })
  status: StatusUrbanDevelopment;
}
