import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { DocumentType } from "src/lead/entities/lead.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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
    length: 35,
    nullable: true
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 12,
    nullable: false,
    unique: true
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
    nullable: false
  })
  phone: string;

  @Column({
    type: 'varchar',
    length: 70,
    nullable: false
  })
  address: string;

  @OneToMany(() => SecondaryClientSale, (sale) => sale.secondaryClient)
  secondaryClientSales: SecondaryClientSale[];
}