import { Payment } from "src/admin-payments/payments/entities/payment.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('payment_configs')
export class PaymentConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 60,
    nullable: false
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 250,
    nullable: true
  })
  description: string;

  @Column({
    type: 'boolean',
    default: true
  })
  requiresApproval: boolean;

  @Column({
    type: 'boolean',
    default: true
  })
  isActive: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  minimumAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  maximumAmount: number;

  @OneToMany(() => Payment, (payment) => payment.paymentConfig)
  payments: Payment[];

  @BeforeInsert()
  @BeforeUpdate()
  validateConfig() {
    if (
      this.minimumAmount != null &&
      this.maximumAmount != null &&
      this.maximumAmount < this.minimumAmount
    )
      throw new Error('El monto máximo debe ser mayor o igual que el monto mínimo');

    if (this.code)
      this.code = this.code.toUpperCase().trim();

    if (this.name)
      this.name = this.name.trim();

    if (this.description)
      this.description = this.description.trim();
  }
}