import { Timestamped } from 'src/common/entities/timestamped.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { SaleFileMetadata } from '../interfaces/sale-file-metadata.interface';

@Entity('sale_files')
export class SaleFile extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({
    type: 'varchar',
    length: 500,
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 200,
  })
  urlKey: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata?: SaleFileMetadata;
}
