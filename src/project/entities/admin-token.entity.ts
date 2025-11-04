// src/modules/lot/entities/admin-token.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('admin_tokens')
export class AdminToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60 }) // bcrypt genera hashes de 60 caracteres
  codeHash: string;

  @ManyToOne(() => User, (user) => user.generatedAdminTokens, {
    nullable: true,
  })
  @JoinColumn({ name: 'generated_by_user_id' })
  generatedBy: User;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
