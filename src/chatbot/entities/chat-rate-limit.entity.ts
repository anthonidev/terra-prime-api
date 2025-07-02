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

  @Column({
    type: 'timestamp',
    name: 'window_start',
  })
  windowStart: Date;

  @Column({
    default: 0,
    name: 'request_count',
  })
  requestCount: number;

  @Column({
    default: false,
    name: 'is_blocked',
  })
  isBlocked: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'blocked_until',
  })
  blockedUntil: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
