import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExcelService } from './services/excel.service';
import { ProjectService } from './services/project.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProjectController } from './project.controller';
import { Project } from './entities/project.entity';
import { Stage } from './entities/stage.entity';
import { Block } from './entities/block.entity';
import { Lot } from './entities/lot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Stage, Block, Lot]),
    CloudinaryModule,
  ],
  controllers: [ProjectController],
  providers: [ExcelService, ProjectService],
  exports: [TypeOrmModule, ProjectService],
})
export class ProjectModule { }