import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from './lead.entity';
import {
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Liner } from './liner.entity';
import { Participant } from 'src/admin-sales/participants/entities/participant.entity';

@Entity('lead_visits')
export class LeadVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, (lead) => lead.visits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lead_id' })
  @IsNotEmpty({ message: 'El prospecto es requerido' })
  lead: Lead;

  @ManyToOne(() => Liner, { nullable: true })
  @JoinColumn({ name: 'liner_id' })
  @IsOptional()
  liner: Liner;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'La hora de llegada es requerida' })
  @IsDate()
  arrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  departureTime: Date;

  @Column({ nullable: true, type: 'text' })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Las observaciones no pueden tener más de 500 caracteres',
  })
  observations: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  // ========== REPORTE PDF ==========

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reportPdfUrl?: string;

  // ========== PARTICIPANTES ==========

  @ManyToOne(() => Participant, (participant) => participant.leadVisitLiner, { nullable: true })
  @JoinColumn({ name: 'liner_participant_id' })
  linerParticipant?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketingSupervisor, { nullable: true })
  @JoinColumn({ name: 'telemarketing_supervisor_id' })
  telemarketingSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketingConfirmer, { nullable: true })
  @JoinColumn({ name: 'telemarketing_confirmer_id' })
  telemarketingConfirmer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketer, { nullable: true })
  @JoinColumn({ name: 'telemarketer_id' })
  telemarketer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldManager, { nullable: true })
  @JoinColumn({ name: 'field_manager_id' })
  fieldManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldSupervisor, { nullable: true })
  @JoinColumn({ name: 'field_supervisor_id' })
  fieldSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldSeller, { nullable: true })
  @JoinColumn({ name: 'field_seller_id' })
  fieldSeller?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitSalesManager, { nullable: true })
  @JoinColumn({ name: 'sales_manager_id' })
  salesManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitSalesGeneralManager, { nullable: true })
  @JoinColumn({ name: 'sales_general_manager_id' })
  salesGeneralManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitPostSale, { nullable: true })
  @JoinColumn({ name: 'post_sale_id' })
  postSale?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitCloser, { nullable: true })
  @JoinColumn({ name: 'closer_id' })
  closer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitGeneralDirector, { nullable: true })
  @JoinColumn({ name: 'general_director_id' })
  generalDirector?: Participant;
}
