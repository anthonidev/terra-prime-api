import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Transform } from 'class-transformer';
import { Reservation } from 'src/admin-sales/reservations/entities/reservation.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Block } from './block.entity';
import { UpdatePriceToken } from './update-price-token.entity';
export enum LotStatus {
  ACTIVE = 'Activo',
  INACTIVE = 'Inactivo',
  SOLD = 'Vendido',
  RESERVED = 'Separado',
}
@Entity('lots')
@Unique(['name', 'block'])
export class Lot {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  @Transform(({ value }) => value?.trim())
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

  @OneToMany(() => UpdatePriceToken, (updatePriceToken) => updatePriceToken.lot)
  updatePriceTokens: UpdatePriceToken[];

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
