import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { BlockController } from './controllers/block.controller';
import { LotController } from './controllers/lot.controller';
import { ProjectController } from './controllers/project.controller';
import { StageController } from './controllers/stage.controller';
import { Block } from './entities/block.entity';
import { Lot } from './entities/lot.entity';
import { Project } from './entities/project.entity';
import { Stage } from './entities/stage.entity';
import { BlockService } from './services/block.service';
import { ExcelService } from './services/excel.service';
import { LotService } from './services/lot.service';
import { ProjectService } from './services/project.service';
import { StageService } from './services/stage.service';
import { UpdatePriceToken } from './entities/update-price-token.entity';
import { UpdatePriceTokenService } from './services/update-price-token.service';
import { UsersService } from 'src/user/user.service';
import { UsersModule } from 'src/user/user.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Stage, Block, Lot, UpdatePriceToken]),
    FilesModule,
    UsersModule,
  ],
  controllers: [
    ProjectController,
    StageController,
    BlockController,
    LotController,
  ],
  providers: [
    ExcelService,
    ProjectService,
    BlockService,
    LotService,
    StageService,
    UpdatePriceTokenService,
  ],
  exports: [TypeOrmModule, ProjectService, StageService, BlockService, LotService, UpdatePriceTokenService],
})
export class ProjectModule { }
