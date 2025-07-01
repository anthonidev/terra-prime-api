import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  CreateBulkProjectDto,
  ValidateExcelResponseDto,
} from '../dto/bulk-project-upload.dto';
import { FindProjectLotsDto } from '../dto/project-lots.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ExcelService } from '../services/excel.service';
import { LotService } from '../services/lot.service';
import { ProjectService } from '../services/project.service';
import { AwsS3Service } from 'src/files/aws-s3.service';
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  constructor(
    private readonly excelService: ExcelService,
    private readonly projectService: ProjectService,
    private readonly lotService: LotService,
    private readonly awsS3Service: AwsS3Service,
  ) { }
  @Post('validate-excel')
  @Roles('SYS', 'JVE')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidateExcelResponseDto> {
    return this.excelService.validateProjectExcel(file);
  }
  @Post('bulk-create')
  @Roles('SYS', 'JVE')
  async createBulkProject(
    @Body() { projectData }: CreateBulkProjectDto,
  ): Promise<{
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
        stages: project.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          blocks: stage.blocks.map((block) => ({
            id: block.id,
            name: block.name,
            lots: block.lots.length,
          })),
        })),
        totalLots: project.stages.reduce(
          (total, stage) =>
            total +
            stage.blocks.reduce(
              (stageTotal, block) => stageTotal + block.lots.length,
              0,
            ),
          0,
        ),
      },
    };
  }
  @Get()
  @Roles('SYS', 'JVE', 'VEN')
  async findAll() {
    return this.projectService.findAll();
  }
  @Get(':id')
  @Roles('SYS', 'JVE', 'VEN')
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }
  @Patch(':id/with-image')
  @Roles('SYS', 'JVE')
  @UseInterceptors(FileInterceptor('logo'))
  async updateProjectWithImage(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    if (logoFile) {
      try {
        const currentProject = await this.projectService.findOne(id);

        // Subir nueva imagen a S3
        const s3Response = await this.awsS3Service.uploadImage(
          logoFile,
          'projects-logos',
        );

        updateProjectDto.logo = s3Response.url;
        updateProjectDto.logoKey = s3Response.key;

        // Eliminar imagen anterior de S3 si existe
        if (currentProject.logoKey) {
          await this.awsS3Service.deleteFile(currentProject.logoKey);
        }
      } catch (error) {
        throw new InternalServerErrorException(
          `Error al subir la imagen: ${error.message}`,
        );
      }
    }
    return this.projectService.updateProject(id, updateProjectDto);
  }
  @Get(':id/lots')
  @Roles('SYS', 'JVE', 'VEN')
  async findProjectLots(
    @Param('id') projectId: string,
    @Query() findLotsDto: FindProjectLotsDto,
  ) {
    return this.lotService.findProjectLots(projectId, findLotsDto);
  }
}
