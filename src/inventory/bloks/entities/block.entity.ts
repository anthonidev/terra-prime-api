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
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Lot } from '../../lots/entities/lot.entity';
import { Stage } from '../../stages/entities/stage.entity';

@Entity('blocks')
@Unique(['name', 'stage'])
@Index(['isActive'])
@Index(['name'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @Column('bool', {
    default: true,
  })
  isActive: boolean;
  @ManyToOne(() => Stage, (stage) => stage.blocks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  stage: Stage;
  @OneToMany(() => Lot, (lot) => lot.block, {
    cascade: true,
    eager: true,
  })
  lots: Lot[];
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @BeforeInsert()
  @BeforeUpdate()
  trimName() {
    if (this.name) {
      this.name = this.name.trim();
    }
  }
}
