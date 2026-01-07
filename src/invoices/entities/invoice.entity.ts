import { User } from 'src/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import { DocumentType } from '../enums/document-type.enum';
import { ClientDocumentType } from '../enums/client-document-type.enum';
import { Currency } from '../enums/currency.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';

@Entity('invoices')
export class Invoice extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column({
    type: 'varchar',
    length: 10,
  })
  series: string;

  @Column({
    type: 'int',
  })
  number: number;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
  })
  fullNumber: string;

  @Column({
    type: 'int',
    default: 1,
  })
  sunatTransaction: number;

  @Column({
    type: 'varchar',
    length: 2,
  })
  clientDocumentType: ClientDocumentType;

  @Column({
    type: 'varchar',
    length: 20,
  })
  clientDocumentNumber: string;

  @Column({
    type: 'varchar',
    length: 200,
  })
  clientName: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  clientAddress: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  clientEmail: string;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.PEN,
  })
  currency: Currency;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    default: 1,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  exchangeRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 18,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  igvPercentage: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalTaxed: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalUnaffected: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalExonerated: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalFree: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalDiscounts: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalIgv: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  total: number;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
    eager: true
  })
  items: InvoiceItem[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({
    type: 'boolean',
    default: false,
  })
  sendAutomaticallyToSunat: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  sendAutomaticallyToClient: boolean;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  pdfUrl: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  xmlUrl: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  cdrUrl: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  sunatAccepted: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  sunatDescription: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  sunatNote: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  sunatResponseCode: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  sunatSoapError: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  uniqueCode: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'A4',
  })
  pdfFormat: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  observations: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  issueDate: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  dueDate: Date;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: 'related_invoice_id' })
  relatedInvoice: Invoice;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  noteReasonCode: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  noteReasonDescription: string;

  @OneToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;
}
