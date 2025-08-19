import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { DocumentType } from 'src/lead/enums/document-type.enum';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum ParticipantType {
  LINER = 'LINER',
  TELEMARKETING_SUPERVISOR = 'TELEMARKETING_SUPERVISOR',
  TELEMARKETING_CONFIRMER = 'TELEMARKETING_CONFIRMER',
  TELEMARKETER = 'TELEMARKETER',
  FIELD_MANAGER = 'FIELD_MANAGER',
  FIELD_SUPERVISOR = 'FIELD_SUPERVISOR',
  FIELD_SELLER = 'FIELD_SELLER',
}

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

  // La relación que ya tenías (probablemente como garante/guarantor)
  @OneToMany(() => Sale, (sale) => sale.guarantor)
  sales: Sale[];

  @OneToMany(() => Lead, (lead) => lead.liner)
  leadLiner: Lead[];

  @OneToMany(() => Lead, (lead) => lead.telemarketingSupervisor)
  leadTelemarketingSupervisor: Lead[];

  @OneToMany(() => Lead, (lead) => lead.telemarketingConfirmer)
  leadTelemarketingConfirmer: Lead[];

  @OneToMany(() => Lead, (lead) => lead.telemarketer)
  leadTelemarketer: Lead[];

  @OneToMany(() => Lead, (lead) => lead.fieldManager)
  leadFieldManager: Lead[];

  @OneToMany(() => Lead, (lead) => lead.fieldSupervisor)
  leadFieldSupervisor: Lead[];

  @OneToMany(() => Lead, (lead) => lead.fieldSeller)
  leadFieldSeller: Lead[];
}
