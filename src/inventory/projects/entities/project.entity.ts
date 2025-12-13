import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Stage } from '../../stages/entities/stage.entity';

export enum CurrencyType {
  USD = 'USD',
  PEN = 'PEN',
}
@Entity('projects')
@Index(['isActive'])
@Index(['name'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ unique: true })
  name: string;

  @Column({
    type: 'varchar',
    length: 25,
    unique: true,
    nullable: true,
  })
  projectCode?: string;
  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.PEN,
  })
  currency: CurrencyType;
  @Column('bool', {
    default: true,
  })
  isActive: boolean;
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  logo: string | null;
  @Column({
    nullable: true,
    default: null,
  })
  logoKey: string | null;
  @OneToMany(() => Stage, (stage) => stage.project, {
    cascade: true,
    eager: true,
  })
  stages: Stage[];
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
