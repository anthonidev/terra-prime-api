import { Sale } from '@commercial/sales/transaction/contract/entities/sale.entity';
import { Reservation } from '@commercial/sales/transaction/reservation/entities/reservation.entity';
import { CurrencyType } from '@common/enum/currency-type.enum';
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

export enum LotStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  SOLD = 'Vendido',
  RESERVED = 'Separado',
}
@Entity('lots')
@Unique(['name', 'block'])
@Index(['status'])
@Index(['name'])
@Index(['area'])
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @Column('decimal', { precision: 10, scale: 2 })
  area: number;
  @Column('decimal', { precision: 10, scale: 2 })
  lotPrice: number;
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  urbanizationPrice: number;
  @Column({
    type: 'enum',
    enum: LotStatus,
    default: LotStatus.ACTIVE,
  })
  status: LotStatus;

  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.PEN,
    comment: 'Moneda del lote, heredada del proyecto pero modificable',
  })
  currency: CurrencyType;

  @ManyToOne(() => Block, (block) => block.lots, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  block: Block;
  get totalPrice(): number {
    return Number(this.lotPrice) + Number(this.urbanizationPrice);
  }
  @OneToMany(() => Reservation, (reservation) => reservation.lot)
  reservations: Reservation[];

  @OneToMany(() => Sale, (sale) => sale.lot)
  sales: Sale[];

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
