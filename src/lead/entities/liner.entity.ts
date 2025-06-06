import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
enum DocumentType {
  DNI = 'DNI',
  CE = 'CE',
  RUC = 'RUC',
}
@Entity('liners')
export class Liner {
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
  @Column({ default: true })
  isActive: boolean;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
