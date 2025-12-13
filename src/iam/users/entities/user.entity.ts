import { Lead } from '@commercial/leads/entities/lead.entity';
import { Sale } from '@commercial/sales/transaction/contract/entities/sale.entity';
import { Reservation } from '@commercial/sales/transaction/reservation/entities/reservation.entity';
import { SaleWithdrawal } from '@commercial/sales/transaction/withdrawals/entities/sale-withdrawal.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AdminToken } from '../../approvals/entities/admin-token.entity';

import { Role } from './role.entity';

@Entity()
@Index(['email'])
@Index(['document'])
@Index(['isActive'])
@Index(['lastLoginAt'])
@Index(['isActive', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column('text', {
    select: false,
    nullable: false,
  })
  password: string;

  @Column('text', {
    nullable: false,
  })
  document: string;

  @Column('text', {
    nullable: false,
  })
  firstName: string;

  @Column('text', {
    nullable: false,
  })
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

  @OneToMany(() => AdminToken, (adminToken) => adminToken.generatedBy)
  generatedAdminTokens: AdminToken[];

  @OneToMany(() => Reservation, (reservation) => reservation.vendor)
  reservations: User[];

  @OneToMany(() => Lead, (lead) => lead.vendor)
  leads: Lead[];

  @OneToMany(() => SaleWithdrawal, (saleWithdrawal) => saleWithdrawal.reviewedBy)
  withdrawals: SaleWithdrawal[];
}
