import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('late_fee_tee')
export class LateTee extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  amount: number;

  @ManyToOne(() => Sale, (sale) => sale.lateFeeTee)
  sale: Sale;

  @Column({
    type: 'boolean',
    default: false,
  })
  isPaid: boolean;
}