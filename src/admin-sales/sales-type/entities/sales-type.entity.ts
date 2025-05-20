import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('sales_types')
export class SalesType extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 25,
    unique: true,
  })
  description: string;

  @Column({
    type: 'boolean',
    default: true,
  })  
  isActive: boolean;

  @OneToMany(() => Sale, (sale) => sale.type)
  sales: Sale[];
}
