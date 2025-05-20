import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class Timestamped {
  @CreateDateColumn({
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
