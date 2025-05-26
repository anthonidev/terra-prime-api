import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { FinancingInstallments } from "./financing-installments.entity";
import { UrbanDevelopment } from "src/admin-sales/urban-development/entities/urban-development.entity";
import { FinancingType } from "../enums/financing-type.enum";

@Entity('financing')
export class Financing extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({
    type: 'enum',
    enum: FinancingType,
    nullable: false,
  })
  financingType: FinancingType;

  @OneToOne(() => Sale, (sale) => sale.financing)
  sale: Sale;

  @OneToOne(() => UrbanDevelopment, (urbanDevelopment) => urbanDevelopment.financing)
  urbanDevelopment: UrbanDevelopment;

  @OneToMany(() => FinancingInstallments, (installments) => installments.financing)
  financingInstallments: FinancingInstallments[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  initialAmount: number;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  initialPaymentDate: Date;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  interest: number;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  cuoteQuantity: number;
}
