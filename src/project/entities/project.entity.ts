import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsEnum,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Stage } from './stage.entity';
export enum CurrencyType {
  USD = 'USD',
  PEN = 'PEN',
}
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ unique: true })
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
    message: 'El nombre solo debe contener letras, números, espacios y guiones',
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @Column({
    type: 'varchar',
    length: 25,
    unique: true,
    nullable: true,
  })
  projectCode?: string;
  @Column({
    type: 'enum',
    enum: CurrencyType,
    default: CurrencyType.PEN,
  })
  @IsEnum(CurrencyType, { message: 'El tipo de moneda debe ser USD o PEN' })
  currency: CurrencyType;
  @Column('bool', {
    default: true,
  })
  @IsBoolean()
  isActive: boolean;
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  @IsOptional()
  @MaxLength(500, {
    message: 'La URL del logo no puede tener más de 500 caracteres',
  })
  logo: string | null;
  @Column({
    nullable: true,
    default: null,
  })
  @IsOptional()
  logoKey: string | null;
  @OneToMany(() => Stage, (stage) => stage.project, {
    cascade: true,
    eager: true,
  })
  stages: Stage[];
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @BeforeInsert()
  @BeforeUpdate()
  trimName() {
    if (this.name) {
      this.name = this.name.trim();
    }
  }
}
