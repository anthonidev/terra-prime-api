import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Payment } from "./payment.entity";

@Entity('payment_details')
export class PaymentDetails {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Payment,
    (payment) => payment.details,
    { nullable: false, onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true
  })
  url?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true
  })
  urlKey?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true
  })
  bankName: string;

  @Column({ 
    type: 'varchar',
    length: 100,
    nullable: true
  })
  transactionReference: string;

  @Column({
    type: 'timestamp'
  })
  transactionDate: Date;

  @Column({
    type: 'boolean',
    default: true
  })
  isActive: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  validateImage() {
    const now = new Date();
    if (this.transactionDate > now)
      throw new Error('La fecha de transacción no puede ser futura');

    if (this.transactionReference)
      this.transactionReference = this.transactionReference.trim();

    if (this.bankName)
      this.bankName = this.bankName.trim();
  }
}