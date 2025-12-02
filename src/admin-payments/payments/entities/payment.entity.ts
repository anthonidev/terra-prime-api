import { User } from "src/user/entities/user.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MethodPayment } from "../enums/method-payment.enum";
import { StatusPayment } from "../enums/status-payments.enum";
import { PaymentDetails } from "./payment-details.entity";
import { PaymentConfig } from "src/admin-payments/payments-config/entities/payments-config.entity";
import { Timestamped } from "src/common/entities/timestamped.entity";

@Entity('payments') 
export class Payment extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PaymentConfig, { nullable: false })
  @JoinColumn({ name: 'payment_config_id' })
  paymentConfig: PaymentConfig;

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
    type: 'enum',
    enum: StatusPayment,
    default: StatusPayment.PENDING,
  })
  status: StatusPayment;

  @Column({
    type: 'enum',
    enum: MethodPayment,
    default: MethodPayment.VOUCHER
  })
  methodPayment: MethodPayment;

  @Column({
    type: 'varchar',
    length: 25,
    nullable: true
  })
  banckName: string;

  @Column({
    nullable: true,
    type: 'timestamp'
  })
  dateOperation: Date;

  @Column({
    type: 'varchar',
    length: 25,
    nullable: true
  })
  numberTicket: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 25
  })
  rejectionReason: string;

  @OneToMany(
    () => PaymentDetails,
    (item) => item.payment,
    { cascade: true }
  )
  details: PaymentDetails[];

  @ManyToOne(
    () => User,
    { nullable: true }
  )
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ nullable: true, type: 'timestamp' })
  reviewedAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  relatedEntityId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  observation: string;

  @BeforeInsert()
  @BeforeUpdate()
  validatePayment() {
    if (this.status === StatusPayment.REJECTED && !this.rejectionReason) {
      throw new Error('Se requiere una razón para rechazar el pago');
    }
  }
}