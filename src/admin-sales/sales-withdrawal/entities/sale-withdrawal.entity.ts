import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { User } from "src/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('sale_withdrawals')
export class SaleWithdrawal extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Sale, (sale) => sale.withdrawal)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  reason: string;

  @ManyToOne(
    () => User,
    { nullable: true }
  )
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ nullable: true, type: 'timestamp' })
  reviewedAt: Date;
}