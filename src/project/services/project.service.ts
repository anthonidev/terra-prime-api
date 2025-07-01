import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  LotExcelDto,
  LotStatus,
  ProjectExcelDto,
} from '../dto/bulk-project-upload.dto';
import {
  BlockDetailDto,
  ProjectDetailDto,
  StageDetailDto,
} from '../dto/project-detail.dto';
import {
  ProjectListItemDto,
  ProjectListResponseDto,
} from '../dto/project-list.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { Block } from '../entities/block.entity';
import { Lot } from '../entities/lot.entity';
import { Project } from '../entities/project.entity';
import { Stage } from '../entities/stage.entity';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}
  async createBulkProject(projectData: ProjectExcelDto): Promise<Project> {
    const existingProject = await this.projectRepository.findOne({
      where: { name: projectData.name },
    });
    if (existingProject) {
      throw new ConflictException(
        `Ya existe un proyecto con el nombre ${projectData.name}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Crear el proyecto
      const project = queryRunner.manager.create(Project, {
        name: projectData.name,
        currency: projectData.currency,
        isActive: true,
      });
      await queryRunner.manager.save(project);

      // Agrupar lotes por etapa y bloque
      const lotesByStageAndBlock = this.groupLotsByStageAndBlock(
        projectData.lots,
      );

      // Crear mapas para evitar duplicados
      const stageMap = new Map<string, Stage>();
      const blockMap = new Map<string, Block>();

      // Procesar etapas, bloques y lotes
      for (const stageName in lotesByStageAndBlock) {
        // Crear etapa solo si no existe
        let stage = stageMap.get(stageName);
        if (!stage) {
          stage = queryRunner.manager.create(Stage, {
            name: stageName,
            isActive: true,
            project: project,
          });
          await queryRunner.manager.save(stage);
          stageMap.set(stageName, stage);
        }

        for (const blockName in lotesByStageAndBlock[stageName]) {
          // Crear bloque solo si no existe para esta etapa
          const blockKey = `${stageName}-${blockName}`;
          let block = blockMap.get(blockKey);
          if (!block) {
            block = queryRunner.manager.create(Block, {
              name: blockName,
              isActive: true,
              stage: stage,
            });
            await queryRunner.manager.save(block);
            blockMap.set(blockKey, block);
          }

          // Crear lotes
          for (const lotData of lotesByStageAndBlock[stageName][blockName]) {
            const lot = queryRunner.manager.create(Lot, {
              name: lotData.lot.toString(),
              area: lotData.area,
              lotPrice: lotData.lotPrice,
              urbanizationPrice: lotData.urbanizationPrice,
              status: lotData.status,
              block: block,
            });
            await queryRunner.manager.save(lot);
          }
        }
      }

      await queryRunner.commitTransaction();
      return this.findProjectByName(projectData.name);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al crear proyecto: ${error.message}`,
        error.stack,
      );

      // Manejar errores específicos de duplicados
      if (error.code === '23505') {
        // Código de error PostgreSQL para violación de constraint único
        if (error.constraint && error.constraint.includes('UQ_')) {
          throw new ConflictException(
            'Error de duplicación: Ya existe una entidad con los mismos valores únicos',
          );
        }
      }

      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear el proyecto');
    } finally {
      await queryRunner.release();
    }
  }
  private groupLotsByStageAndBlock(lots: LotExcelDto[]): {
    [stage: string]: { [block: string]: LotExcelDto[] };
  } {
    const result: { [stage: string]: { [block: string]: LotExcelDto[] } } = {};
    for (const lot of lots) {
      if (!result[lot.stage]) {
        result[lot.stage] = {};
      }
      if (!result[lot.stage][lot.block]) {
        result[lot.stage][lot.block] = [];
      }
      result[lot.stage][lot.block].push(lot);
    }
    return result;
  }
  async findProjectByName(name: string): Promise<Project> {
    return this.projectRepository.findOne({
      where: { name },
      relations: ['stages', 'stages.blocks', 'stages.blocks.lots'],
    });
  }
  async findAll(): Promise<ProjectListResponseDto> {
    try {
      const projects = await this.projectRepository.find({
        relations: ['stages', 'stages.blocks', 'stages.blocks.lots'],
        order: {
          updatedAt: 'DESC',
        },
      });
      const projectDtos: ProjectListItemDto[] = projects.map((project) => {
        let blockCount = 0;
        let lotCount = 0;
        let activeLotCount = 0;
        project.stages.forEach((stage) => {
          blockCount += stage.blocks.length;
          stage.blocks.forEach((block) => {
            lotCount += block.lots.length;
            activeLotCount += block.lots.filter(
              (lot) => lot.status === LotStatus.ACTIVE,
            ).length;
          });
        });
        return {
          id: project.id,
          name: project.name,
          currency: project.currency,
          isActive: project.isActive,
          logo: project.logo,
          stageCount: project.stages.length,
          blockCount,
          lotCount,
          activeLotCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      });
      return {
        projects: projectDtos,
        total: projectDtos.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener proyectos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener los proyectos');
    }
  }
  async findOne(id: string): Promise<ProjectDetailDto> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id },
        relations: ['stages', 'stages.blocks', 'stages.blocks.lots'],
      });
      if (!project) {
        throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
      }
      const stages: StageDetailDto[] = project.stages.map((stage) => {
        const blocks: BlockDetailDto[] = stage.blocks.map((block) => {
          return {
            id: block.id,
            name: block.name,
            isActive: block.isActive,
            lotCount: block.lots.length,
            stageId: stage.id,
            activeLots: block.lots.filter((lot) => lot.status === 'Activo')
              .length,
            reservedLots: block.lots.filter((lot) => lot.status === 'Separado')
              .length,
            soldLots: block.lots.filter((lot) => lot.status === 'Vendido')
              .length,
            inactiveLots: block.lots.filter((lot) => lot.status === 'Inactivo')
              .length,
          };
        });
        return {
          id: stage.id,
          name: stage.name,
          isActive: stage.isActive,
          blocks,
        };
      });
      const projectDetail: ProjectDetailDto = {
        id: project.id,
        name: project.name,
        currency: project.currency,
        isActive: project.isActive,
        logo: project.logo,
        logoKey: project.logoKey,
        stages,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
      return projectDetail;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener proyecto ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener el proyecto');
    }
  }
  async updateProject(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDetailDto> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id },
        relations: ['stages', 'stages.blocks', 'stages.blocks.lots'],
      });
      if (!project) {
        throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
      }
      if (updateProjectDto.name && updateProjectDto.name !== project.name) {
        const existingProject = await this.projectRepository.findOne({
          where: { name: updateProjectDto.name },
        });
        if (existingProject) {
          throw new ConflictException(
            `Ya existe un proyecto con el nombre ${updateProjectDto.name}`,
          );
        }
      }
      Object.assign(project, updateProjectDto);
      await this.projectRepository.save(project);
      return this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar proyecto ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar el proyecto');
    }
  }

  // Internal helpers methods
  // Lista de proyectos activos
  async findAllActiveProjects(): Promise<Project[]> {
    const projects = await this.projectRepository.find({
      where: { isActive: true },
      order: {
        createdAt: 'DESC',
      },
    });
    return projects;
  }
}
