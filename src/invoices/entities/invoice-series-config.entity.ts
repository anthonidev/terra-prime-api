import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from 'src/common/entities/timestamped.entity';
import { DocumentType } from '../enums/document-type.enum';

@Entity('invoice_series_config')
export class InvoiceSeriesConfig extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DocumentType,
    unique: true,
  })
  documentType: DocumentType;

  @Column({
    type: 'varchar',
    length: 10,
  })
  series: string;

  @Column({
    type: 'int',
    default: 0,
  })
  lastNumber: number;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  description: string;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;
}
