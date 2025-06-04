import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('sale_withdrawals')
export class SaleWithdrawal extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Sale, (sale) => sale.withdrawal)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;
}