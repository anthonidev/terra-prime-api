import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';
import { User } from './user.entity';
import { View } from './view.entity';

@Entity('roles')
@Index(['code'])
@Index(['isActive'])
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Transform(({ value }) => value?.toUpperCase().trim())
  code: string;

  @Column()
  @Transform(({ value }) => value?.trim())
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @ManyToMany(() => View)
  @JoinTable({
    name: 'role_views',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'view_id',
      referencedColumnName: 'id',
    },
  })
  views: View[];

  @BeforeInsert()
  @BeforeUpdate()
  transformCode() {
    if (this.code) {
      this.code = this.code.toUpperCase().trim();
    }
  }

  hasView(viewCode: string): boolean {
    return this.views?.some((view) => view.code === viewCode) ?? false;
  }

  hasAnyView(viewCodes: string[]): boolean {
    return this.views?.some((view) => viewCodes.includes(view.code)) ?? false;
  }

  hasAllViews(viewCodes: string[]): boolean {
    return viewCodes.every((code) => this.hasView(code));
  }
}
