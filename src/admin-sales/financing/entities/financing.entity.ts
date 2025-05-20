import { FinancingType } from "src/admin-sales/financing-type/entities/financing-type.entity";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { FinancingInstallments } from "./financing-installments.entity";
import { UrbanDevelopment } from "src/admin-sales/urban-development/entities/urban-development.entity";

@Entity('financing')
export class Financing extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @ManyToOne(() => FinancingType, (type) => type.financings)
  type: FinancingType;

  @OneToOne(() => Sale, (sale) => sale.financing)
  sales: Sale;

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
  cuoteQuantityLot: number;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  cuoteQuantityHU: number;

  @Column({
    type: 'numeric',
    nullable: false,
  })
  cuoteQuantityTotal: number;
}
