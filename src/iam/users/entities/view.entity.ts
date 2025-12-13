import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from './role.entity';

@Entity('views')
@Index(['code'])
@Index(['isActive'])
@Index(['order'])
@Index(['isActive', 'order'])
export class View {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ nullable: true })
  url: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @ManyToOne(() => View, (view) => view.children, { nullable: true })
  parent: View;

  @OneToMany(() => View, (view) => view.parent, { nullable: true })
  children: View[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'role_views',
    joinColumn: {
      name: 'view_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  transformFields() {
    if (this.code) {
      this.code = this.code.toUpperCase().trim();
    }
    if (this.name) {
      this.name = this.name.trim();
    }
  }

  isParentView(): boolean {
    return !this.parent && this.children?.length > 0;
  }

  isChildView(): boolean {
    return !!this.parent;
  }

  hasRole(roleCode: string): boolean {
    return this.roles?.some((role) => role.code === roleCode) ?? false;
  }
}
