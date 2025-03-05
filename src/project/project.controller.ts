import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ExcelService } from './services/excel.service';
import { ProjectService } from './services/project.service';
import { CreateBulkProjectDto, ValidateExcelResponseDto } from './dto/bulk-project-upload.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(
    private readonly excelService: ExcelService,
    private readonly projectService: ProjectService,
  ) { }

  /**
   * Valida un archivo Excel de proyectos sin guardar en la base de datos
   */
  @Post('validate-excel')
  @Roles('SYS', 'GVE')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidateExcelResponseDto> {
    return this.excelService.validateProjectExcel(file);
  }

  /**
   * Crea un proyecto con todas sus etapas, manzanas y lotes
   * a partir de datos previamente validados
   */
  @Post('bulk-create')
  @Roles('SYS', 'GVE')
  async createBulkProject(@Body() { projectData }: CreateBulkProjectDto): Promise<{
    message: string;
    project: {
      id: string;
      name: string;
      currency: string;
      stages: {
        id: string;
        name: string;
        blocks: {
          id: string;
          name: string;
          lots: number;
        }[];
      }[];
      totalLots: number;
    };
  }> {
    const project = await this.projectService.createBulkProject(projectData);
    return {
      message: 'Proyecto creado exitosamente',
      project: {
        id: project.id,
        name: project.name,
        currency: project.currency,
        stages: project.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          blocks: stage.blocks.map(block => ({
            id: block.id,
            name: block.name,
            lots: block.lots.length,
          })),
        })),
        totalLots: project.stages.reduce(
          (total, stage) => total + stage.blocks.reduce(
            (stageTotal, block) => stageTotal + block.lots.length, 0
          ), 0
        ),
      },
    };
  }
}