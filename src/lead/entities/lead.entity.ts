import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeadSource } from './lead-source.entity';
import { LeadVisit } from './lead-visit.entity';
import { Ubigeo } from './ubigeo.entity';
import { Client } from 'src/admin-sales/clients/entities/client.entity';
import { User } from 'src/user/entities/user.entity';
import { DocumentType } from '../enums/document-type.enum';
@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  firstName: string;
  @Column()
  lastName: string;
  @Column({ nullable: true })
  email: string;
  @Column({ unique: true })
  document: string;
  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.DNI,
  })
  documentType: DocumentType;
  @Column({ nullable: true })
  phone: string;
  @Column({ nullable: true })
  phone2: string;
  @Column({ nullable: true })
  age: number;
  @ManyToOne(() => Ubigeo, { nullable: true })
  @JoinColumn({ name: 'ubigeo_id' })
  ubigeo: Ubigeo;
  @ManyToOne(() => LeadSource, { nullable: true })
  @JoinColumn({ name: 'lead_source_id' })
  source: LeadSource;
  @OneToMany(() => LeadVisit, (visit) => visit.lead, { cascade: true })
  visits: LeadVisit[];
  @OneToOne(() => Client, (client) => client.lead)
  client: Client;
  @ManyToOne(() => User, (user) => user.leads)
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;
  @Column({ default: true })
  isActive: boolean;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn({ select: false })
  updatedAt: Date;
  @Column({ default: false })
  isInOffice: boolean;
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  interestProjects?: string[];

  @Column({
    type: 'json',
    nullable: true,
  })
  companions?: { fullName: string; dni?: string; relationship?: string }[];

  @Column({
    type: 'json',
    nullable: true,
  })
  metadata?: Record<string, any>;
}
