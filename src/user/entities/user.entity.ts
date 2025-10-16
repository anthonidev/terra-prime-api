import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Exclude, Transform } from 'class-transformer';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Reservation } from 'src/admin-sales/reservations/entities/reservation.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { UpdatePriceToken } from 'src/project/entities/update-price-token.entity';
import { SaleWithdrawal } from 'src/admin-sales/sales-withdrawal/entities/sale-withdrawal.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @Column('text', {
    select: false,
    nullable: false,
  })
  @Exclude()
  password: string;

  @Column('text', {
    nullable: false,
  })
  document: string;

  @Column('text', {
    nullable: false,
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @Column('text', {
    nullable: false,
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  photo: string | null;

  @Column('bool', {
    default: true,
  })
  isActive: boolean;

  @ManyToOne(() => Role, {
    nullable: false,
  })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  lastLoginAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.email = this.email?.toLowerCase().trim();
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  @OneToMany(() => Sale, (sale) => sale.vendor)
  sales: Sale[];

  @OneToMany(
    () => UpdatePriceToken,
    (updatePriceToken) => updatePriceToken.generatedBy,
  )
  generatedPriceTokens: UpdatePriceToken[];

  @OneToMany(() => Reservation, (reservation) => reservation.vendor)
  reservations: User[];

  @OneToMany(() => Lead, (lead) => lead.vendor)
  leads: Lead[];

  @OneToMany(
    () => SaleWithdrawal,
    (saleWithdrawal) => saleWithdrawal.reviewedBy,
  )
  withdrawals: SaleWithdrawal[];
}
