// src/modules/lot/entities/update-price-token.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  BeforeInsert, // Importar BeforeInsert
  BeforeUpdate, // Importar BeforeUpdate
} from 'typeorm';
import { Lot } from './lot.entity';
import { User } from 'src/user/entities/user.entity';

// No agregamos bcrypt aquí, solo definimos el campo para el hash
@Entity('update_price_tokens')
export class UpdatePriceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60 }) // bcrypt genera hashes de 60 caracteres
  codeHash: string; // Cambiado de 'code' a 'codeHash'

  @ManyToOne(() => User, (user) => user.generatedPriceTokens, {
    nullable: true,
  })
  @JoinColumn({ name: 'generated_by_user_id' })
  generatedBy: User;

  @ManyToOne(() => Lot, (lot) => lot.updatePriceTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
