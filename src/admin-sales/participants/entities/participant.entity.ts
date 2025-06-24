import { Sale } from "src/admin-sales/sales/entities/sale.entity";
import { DocumentType } from "src/lead/entities/lead.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('participants')
export class Participant {
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
  
    @OneToMany(() => Sale, (sale) => sale.guarantor)
    sales: Sale[];
}
