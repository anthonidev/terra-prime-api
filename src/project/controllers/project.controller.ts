import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { ValidateExcelResponseDto } from '../dto/bulk-project-upload.dto';
import { FindProjectLotsDto } from '../dto/project-lots.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ExcelService } from '../services/excel.service';
import { LotService } from '../services/lot.service';
import { ProjectService } from '../services/project.service';
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);
  constructor(
    private readonly excelService: ExcelService,
    private readonly projectService: ProjectService,
    private readonly lotService: LotService,
    private readonly awsS3Service: AwsS3Service,
  ) {}
  @Post('validate-excel')
  @Roles('SYS', 'JVE')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidateExcelResponseDto> {
    try {
      // Validar que se haya enviado un archivo
      if (!file) {
        throw new BadRequestException('No se ha proporcionado ningún archivo');
      }

      // Validar tipo de archivo
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Tipo de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls)',
        );
      }

      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          'El archivo es demasiado grande. Máximo permitido: 10MB',
        );
      }

      this.logger.log(
        `📁 Validando archivo Excel: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`,
      );

      // Procesar el archivo
      const result = await this.excelService.validateProjectExcel(file);

      // Log del resultado
      if (result.isValid) {
        this.logger.log(
          `✅ Validación exitosa - ${result.summary?.totalLots} lotes procesados`,
        );
      } else {
        this.logger.warn(
          `❌ Validación fallida - ${result.errors?.length} errores encontrados`,
        );

        // Log resumen de errores
        if (result.summary) {
          const {
            duplicateGroups,
            totalDuplicates,
            formatErrors,
            validationErrors,
          } = result.summary;
          this.logger.warn(`   📊 Resumen de errores:`);
          if (totalDuplicates > 0) {
            this.logger.warn(
              `      🔄 Duplicados: ${totalDuplicates} lotes en ${duplicateGroups} grupos`,
            );
          }
          if (formatErrors > 0) {
            this.logger.warn(`      📝 Formato: ${formatErrors} errores`);
          }
          if (validationErrors > 0) {
            this.logger.warn(
              `      ⚠️  Validación: ${validationErrors} errores`,
            );
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error al validar archivo Excel: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno al procesar el archivo Excel',
      );
    }
  }

  @Post('bulk-create')
  @Roles('SYS', 'JVE')
  @UseInterceptors(FileInterceptor('file'))
  async createBulkProject(@UploadedFile() file: Express.Multer.File): Promise<{
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
    try {
      if (!file) {
        throw new BadRequestException('No se ha proporcionado ningún archivo');
      }

      this.logger.log(
        `🚀 Iniciando creación masiva de proyecto desde: ${file.originalname}`,
      );

      // Primero validar el archivo
      const validate = await this.excelService.validateProjectExcel(file);

      if (!validate.isValid) {
        this.logger.error(
          `❌ Archivo no válido. Errores: ${validate.errors?.length}`,
        );

        // Crear mensaje de error más descriptivo
        let errorMessage = 'El archivo Excel contiene errores:\n';

        if (validate.summary) {
          const {
            duplicateGroups,
            totalDuplicates,
            formatErrors,
            validationErrors,
          } = validate.summary;

          if (totalDuplicates > 0) {
            errorMessage += `• ${totalDuplicates} lotes duplicados en ${duplicateGroups} grupos\n`;
          }
          if (formatErrors > 0) {
            errorMessage += `• ${formatErrors} errores de formato\n`;
          }
          if (validationErrors > 0) {
            errorMessage += `• ${validationErrors} errores de validación\n`;
          }
        }

        errorMessage += '\nPor favor, corrija los errores y vuelva a intentar.';

        throw new BadRequestException({
          message: errorMessage,
          errors: validate.errors,
          summary: validate.summary,
        });
      }

      // Crear el proyecto
      const project = await this.projectService.createBulkProject(
        validate.data,
      );

      this.logger.log(
        `✅ Proyecto "${project.name}" creado exitosamente con ${validate.summary?.totalLots} lotes`,
      );

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
          totalLots: validate.summary?.totalLots || 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al crear proyecto masivo: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno al crear el proyecto',
      );
    }
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
