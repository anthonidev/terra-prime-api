import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import {
    IsBoolean,
    IsNotEmpty,
    MaxLength,
    MinLength,
    Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Project } from './project.entity';
import { Block } from './block.entity';

@Entity('stages')
@Unique(['name', 'project']) // El nombre debe ser único dentro del proyecto
export class Stage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @IsNotEmpty({ message: 'El nombre de la etapa es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
    @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, {
        message: 'El nombre solo debe contener letras, números, espacios y guiones',
    })
    @Transform(({ value }) => value?.trim())
    name: string;

    @Column('bool', {
        default: true,
    })
    @IsBoolean()
    isActive: boolean;

    @ManyToOne(() => Project, (project) => project.stages, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    project: Project;

    @OneToMany(() => Block, (block) => block.stage, {
        cascade: true,
        eager: true,
    })
    blocks: Block[];

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