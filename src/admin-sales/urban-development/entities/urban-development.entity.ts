import { Financing } from "src/admin-sales/financing/entities/financing.entity";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StatusUrbanDevelopment } from "../enums/status-urban-development.enum";
import { Timestamped } from "src/common/entities/timestamped.entity";

@Entity('urban_development')
export class UrbanDevelopment extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Financing, (financing) => financing.urbanDevelopment)
  @JoinColumn({ name: 'financing_id' })
  financing: Financing;

  @OneToOne(() => Sale, (sale) => sale.urbanDevelopment)
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