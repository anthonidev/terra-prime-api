import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { FinancingInstallments } from "./financing-installments.entity";
import { UrbanDevelopment } from "src/admin-sales/urban-development/entities/urban-development.entity";
import { FinancingType } from "../enums/financing-type.enum";

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

  @OneToOne(() => Sale, (sale) => sale.financing,{  onDelete: 'CASCADE' })
  sale: Sale;

  @OneToOne(
    () => UrbanDevelopment,
    (urbanDevelopment) => urbanDevelopment.financing,
    { onDelete: 'CASCADE' }
  )
  urbanDevelopment: UrbanDevelopment;

  @OneToMany(
    () => FinancingInstallments,
    (installments) => installments.financing,
    {onDelete: 'CASCADE'}
  )
  financingInstallments: FinancingInstallments[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  initialAmount: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  interestRate: number;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  quantityCoutes: number;
}
