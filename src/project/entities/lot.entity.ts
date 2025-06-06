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
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  MaxLength,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Block } from './block.entity';
import { Reservation } from 'src/admin-sales/reservations/entities/reservation.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
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
  @IsNotEmpty({ message: 'El nombre del lote es requerido' })
  @MinLength(1, { message: 'El nombre debe tener al menos 1 caracter' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
    message: 'El nombre solo debe contener letras, números, espacios y guiones',
  })
  @Transform(({ value }) => value?.trim())
  name: string;
  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber({}, { message: 'El área debe ser un número' })
  @Min(0.01, { message: 'El área debe ser mayor a 0' })
  area: number;
  @Column('decimal', { precision: 10, scale: 2 })
  @IsNumber({}, { message: 'El precio del lote debe ser un número' })
  @Min(0.01, { message: 'El precio del lote debe ser mayor a 0' })
  lotPrice: number;
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  @IsNumber(
    {},
    { message: 'El precio de habilitación urbana debe ser un número' },
  )
  @Min(0, {
    message: 'El precio de habilitación urbana debe ser mayor o igual a 0',
  })
  urbanizationPrice: number;
  @Column({
    type: 'enum',
    enum: LotStatus,
    default: LotStatus.ACTIVE,
  })
  @IsEnum(LotStatus, {
    message: 'El estado debe ser Activo, Inactivo, Vendido o Separado',
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
