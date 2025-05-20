import { Client } from "src/admin-sales/clients/entities/client.entity";
import { DocumentType } from "src/lead/entities/lead.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('guarantors')
export class Guarantor {
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

  @OneToMany(() => Client, (client) => client.guarantor)
  clients: Client[];
}