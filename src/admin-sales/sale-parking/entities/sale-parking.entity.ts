import { Financing } from 'src/admin-sales/financing/entities/financing.entity';
import { Parking } from 'src/admin-sales/parking/entities/parking.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { StatusUrbanDevelopment } from 'src/admin-sales/urban-development/enums/status-urban-development.enum';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sale_parkings')
export class SaleParking extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  sale: Sale;

  @ManyToOne(() => Parking, { nullable: false })
  parking: Parking;

  @OneToOne(() => Financing, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'financing_id' })
  financing: Financing;

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
    default: 0,
  })
  initialAmount: number;

  @Column({
    type: 'enum',
    enum: StatusUrbanDevelopment,
    default: StatusUrbanDevelopment.PENDING,
  })
  status: StatusUrbanDevelopment;
}
