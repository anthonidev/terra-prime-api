import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Timestamped } from '../../../../../common/entities/timestamped.entity';
import { DocumentType } from '../../../../leads/enums/document-type.enum';
import { Sale } from '../../../transaction/contract/entities/sale.entity';

@Entity('guarantors')
export class Guarantor extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  firstName: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  lastName: string;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 12,
    nullable: false,
    unique: true,
  })
  document: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.DNI,
  })
  documentType: DocumentType;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  phone: string;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: false,
  })
  address: string;

  @OneToMany(() => Sale, (sale) => sale.guarantor)
  sales: Sale[];
}
