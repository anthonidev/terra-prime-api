import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeadSource } from './lead-source.entity';
import { LeadVisit } from './lead-visit.entity';
import { Ubigeo } from './ubigeo.entity';
import { Client } from 'src/admin-sales/clients/entities/client.entity';
import { User } from 'src/user/entities/user.entity';
export enum DocumentType {
  DNI = 'DNI',
  CE = 'CE',
  RUC = 'RUC',
}
@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @Column()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @IsString()
  @MaxLength(100, {
    message: 'El apellido no puede tener más de 100 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @Column({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @Column({ unique: true })
  @IsNotEmpty({ message: 'El documento es requerido' })
  @IsString()
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  document: string;
  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.DNI,
  })
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o CE' })
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  documentType: DocumentType;
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phone: string;
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  phone2: string;
  @Column({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(18, { message: 'La edad mínima es 18 años' })
  @Max(120, { message: 'La edad máxima es 120 años' })
  age: number;
  @ManyToOne(() => Ubigeo, { nullable: true })
  @JoinColumn({ name: 'ubigeo_id' })
  @IsOptional()
  ubigeo: Ubigeo;
  @ManyToOne(() => LeadSource, { nullable: true })
  @JoinColumn({ name: 'lead_source_id' })
  @IsOptional()
  source: LeadSource;
  @OneToMany(() => LeadVisit, (visit) => visit.lead, { cascade: true })
  visits: LeadVisit[];
  @OneToOne(() => Client, (client) => client.lead)
  client: Client;
  @ManyToOne(() => User, (user) => user.leads)
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;
  @Column({ default: true })
  isActive: boolean;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column({ default: false })
  @IsBoolean()
  isInOffice: boolean;
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reportPdfUrl?: string;
}
