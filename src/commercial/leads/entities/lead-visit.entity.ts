import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Participant } from '../../sales/stakeholders/participants/entities/participant.entity';

import { Lead } from './lead.entity';

@Entity('lead_visits')
export class LeadVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, (lead) => lead.visits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  departureTime: Date;

  @Column({ nullable: true, type: 'text' })
  observations: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reportPdfUrl?: string;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitLiner, { nullable: true })
  @JoinColumn({ name: 'liner_participant_id' })
  linerParticipant?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketingSupervisor, {
    nullable: true,
  })
  @JoinColumn({ name: 'telemarketing_supervisor_id' })
  telemarketingSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketingConfirmer, {
    nullable: true,
  })
  @JoinColumn({ name: 'telemarketing_confirmer_id' })
  telemarketingConfirmer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitTelemarketer, {
    nullable: true,
  })
  @JoinColumn({ name: 'telemarketer_id' })
  telemarketer?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldManager, {
    nullable: true,
  })
  @JoinColumn({ name: 'field_manager_id' })
  fieldManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldSupervisor, {
    nullable: true,
  })
  @JoinColumn({ name: 'field_supervisor_id' })
  fieldSupervisor?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitFieldSeller, {
    nullable: true,
  })
  @JoinColumn({ name: 'field_seller_id' })
  fieldSeller?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitSalesManager, {
    nullable: true,
  })
  @JoinColumn({ name: 'sales_manager_id' })
  salesManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitSalesGeneralManager, {
    nullable: true,
  })
  @JoinColumn({ name: 'sales_general_manager_id' })
  salesGeneralManager?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitPostSale, { nullable: true })
  @JoinColumn({ name: 'post_sale_id' })
  postSale?: Participant;

  @ManyToOne(() => Participant, (participant) => participant.leadVisitCloser, { nullable: true })
  @JoinColumn({ name: 'closer_id' })
  closer?: Participant;
}
