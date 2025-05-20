import { FinancingType } from "src/admin-sales/financing-type/entities/financing-type.entity";
import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { FinancingInstallments } from "./financing-installments.entity";

@Entity('financing')
export class Financing extends Timestamped {
  id: number;

  @ManyToOne(() => FinancingType, (type) => type.financings)
  type: FinancingType;

  @OneToOne(() => Sale, (sale) => sale.financing)
  @JoinColumn({ name: 'financing_id' })
  sales: Sale[];

  @OneToMany(() => FinancingInstallments, (installments) => installments.financing)
  financingInstallments: FinancingInstallments[];

  @Column({
    type: 'numeric',
    nullable: false,
  })
  cuoteQuantity: number;
}
