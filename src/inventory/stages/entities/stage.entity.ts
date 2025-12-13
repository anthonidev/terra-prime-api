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

import { Block } from '../../bloks/entities/block.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity('stages')
@Unique(['name', 'project'])
@Index(['isActive'])
@Index(['name'])
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @Column('bool', {
    default: true,
  })
  isActive: boolean;
  @ManyToOne(() => Project, (project) => project.stages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  project: Project;
  @OneToMany(() => Block, (block) => block.stage, {
    cascade: true,
    eager: true,
  })
  blocks: Block[];
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
