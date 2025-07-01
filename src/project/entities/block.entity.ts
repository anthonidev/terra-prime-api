import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Transform } from 'class-transformer';
import { Lot } from './lot.entity';
import { Stage } from './stage.entity';
@Entity('blocks')
@Unique(['name', 'stage'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  @Transform(({ value }) => value?.trim())
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
