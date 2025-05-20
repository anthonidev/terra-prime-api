import { Financing } from "src/admin-sales/financing/entities/financing.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('financing_types')
export class FinancingType extends Timestamped {
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

  @OneToMany(() => Financing, (sale) => sale.type)
  financings: Financing[];

}

