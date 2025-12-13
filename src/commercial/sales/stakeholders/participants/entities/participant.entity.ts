import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { LeadVisit } from '../../../../leads/entities/lead-visit.entity';
import { DocumentType } from '../../../../leads/enums/document-type.enum';
import { Sale } from '../../../transaction/contract/entities/sale.entity';
import { ParticipantType } from '../enum/participant-type.enum';

@Entity('participants')
export class Participant extends Timestamped {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  firstName: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  lastName: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 12,
    nullable: false,
    unique: true,
  })
  document: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.DNI,
  })
  documentType: DocumentType;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  phone: string;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: false,
  })
  address: string;

  @Column({
    type: 'enum',
    enum: ParticipantType,
    nullable: false,
  })
  participantType: ParticipantType;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @OneToMany(() => Sale, (sale) => sale.liner)
  liner: Sale[];

  // Ventas como Supervisor de telemarketing
  @OneToMany(() => Sale, (sale) => sale.telemarketingSupervisor)
  telemarketingSupervisor: Sale[];

  // Ventas como Confirmador de telemarketing
  @OneToMany(() => Sale, (sale) => sale.telemarketingConfirmer)
  telemarketingConfirmer: Sale[];

  // Ventas como Telemarketing
  @OneToMany(() => Sale, (sale) => sale.telemarketer)
  telemarketer: Sale[];

  // Ventas como Jefe de campo
  @OneToMany(() => Sale, (sale) => sale.fieldManager)
  fieldManager: Sale[];

  // Ventas como Supervisor de campo
  @OneToMany(() => Sale, (sale) => sale.fieldSupervisor)
  fieldSupervisor: Sale[];

  // Ventas como Vendedor de campo
  @OneToMany(() => Sale, (sale) => sale.fieldSeller)
  fieldSeller: Sale[];

  // Ventas como Jefe de Ventas
  @OneToMany(() => Sale, (sale) => sale.salesManager)
  salesManager: Sale[];

  // Ventas como Gerente de Ventas
  @OneToMany(() => Sale, (sale) => sale.salesGeneralManager)
  salesGeneralManager: Sale[];

  // Ventas como PostVenta
  @OneToMany(() => Sale, (sale) => sale.postSale)
  postSale: Sale[];

  // Ventas como Closer
  @OneToMany(() => Sale, (sale) => sale.closer)
  closer: Sale[];

  // La relación que ya tenías (probablemente como garante/guarantor)
  @OneToMany(() => Sale, (sale) => sale.guarantor)
  sales: Sale[];

  // ========== LEAD VISIT RELATIONS ==========

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.linerParticipant)
  leadVisitLiner: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.telemarketingSupervisor)
  leadVisitTelemarketingSupervisor: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.telemarketingConfirmer)
  leadVisitTelemarketingConfirmer: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.telemarketer)
  leadVisitTelemarketer: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.fieldManager)
  leadVisitFieldManager: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.fieldSupervisor)
  leadVisitFieldSupervisor: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.fieldSeller)
  leadVisitFieldSeller: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.salesManager)
  leadVisitSalesManager: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.salesGeneralManager)
  leadVisitSalesGeneralManager: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.postSale)
  leadVisitPostSale: LeadVisit[];

  @OneToMany(() => LeadVisit, (leadVisit) => leadVisit.closer)
  leadVisitCloser: LeadVisit[];
}
