import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('chat_rate_limits')
@Index(['user', 'windowStart'], { unique: true })
export class ChatRateLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamp' })
  windowStart: Date;

  @Column({ default: 0 })
  requestCount: number;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  blockedUntil: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
