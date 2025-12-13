import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { DocumentType } from '../../../../leads/enums/document-type.enum';

import { SecondaryClientSale } from './secondary-client-sale.entity';

@Entity('secondary_clients')
export class SecondaryClient {
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
    nullable: true,
  })
  phone: string;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: true,
  })
  address: string;

  @OneToMany(() => SecondaryClientSale, (sale) => sale.secondaryClient)
  secondaryClientSales: SecondaryClientSale[];
}
