import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import {
  IsEmail,
  MinLength,
  IsString,
  IsBoolean,
  IsUUID,
  IsOptional,
  IsDate,
  Matches,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Exclude, Transform } from 'class-transformer';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Reservation } from 'src/admin-sales/reservations/entities/reservation.entity';
import { Lead } from 'src/lead/entities/lead.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;
  @Column({ unique: true })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @Column('text', {
    select: false,
    nullable: false,
  })
  @Exclude()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{6,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
  @Column('text', {
    nullable: false,
  })
  @IsString()
  @MinLength(8, { message: 'El documento debe tener al menos 8 caracteres' })
  @MaxLength(20, {
    message: 'El documento no puede tener más de 20 caracteres',
  })
  @IsNotEmpty({ message: 'El documento es requerido' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo debe contener números' })
  document: string;
  @Column('text', {
    nullable: false,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El nombre solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @Column('text', {
    nullable: false,
  })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]{2,}$/, {
    message: 'El apellido solo debe contener letras y espacios',
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'La URL de la foto no puede tener más de 500 caracteres',
  })
  @Matches(/^https?:\/\/.*\.(jpg|jpeg|png)$/, {
    message:
      'La URL de la foto debe ser válida y terminar en jpg, jpeg, png o gif',
  })
  photo: string | null;
  @Column('bool', {
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
  @ManyToOne(() => Role, {
    nullable: false,
  })
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: Role;
  @CreateDateColumn()
  @IsDate()
  createdAt: Date;
  @UpdateDateColumn()
  @IsDate()
  updatedAt: Date;
  @Column('text', { nullable: true })
  @IsOptional()
  @IsDate()
  lastLoginAt: Date;
  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.email = this.email?.toLowerCase().trim();
  }
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  @OneToMany(() => Sale, (sale) => sale.vendor)
  sales: Sale[];

  @OneToMany(() => Reservation, (reservation) => reservation.vendor)
  reservations: User[];

  @OneToMany(() => Lead, (lead) => lead.vendor)
  leads: Lead[];
}
