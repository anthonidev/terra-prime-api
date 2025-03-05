import { Injectable, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectExcelDto, LotExcelDto } from '../dto/bulk-project-upload.dto';
import { Project } from '../entities/project.entity';
import { Stage } from '../entities/stage.entity';
import { Block } from '../entities/block.entity';
import { Lot } from '../entities/lot.entity';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * Crea un proyecto junto con todas sus etapas, manzanas y lotes en una transacción
   */
  async createBulkProject(projectData: ProjectExcelDto): Promise<Project> {
    // Verificar si ya existe un proyecto con ese nombre
    const existingProject = await this.projectRepository.findOne({
      where: { name: projectData.name },
    });

    if (existingProject) {
      throw new ConflictException(`Ya existe un proyecto con el nombre ${projectData.name}`);
    }

    // Crear un queryRunner para gestionar la transacción
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

      // Organizar los lotes por etapa y manzana
      const lotesByStageAndBlock = this.groupLotsByStageAndBlock(projectData.lots);

      // Crear etapas, manzanas y lotes
      for (const stageName in lotesByStageAndBlock) {
        const stage = queryRunner.manager.create(Stage, {
          name: stageName,
          isActive: true,
          project: project,
        });

        await queryRunner.manager.save(stage);

        for (const blockName in lotesByStageAndBlock[stageName]) {
          const block = queryRunner.manager.create(Block, {
            name: blockName,
            isActive: true,
            stage: stage,
          });

          await queryRunner.manager.save(block);

          // Crear lotes para esta manzana
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

      // Confirmar la transacción
      await queryRunner.commitTransaction();

      // Retornar el proyecto creado con todas sus relaciones
      return this.findProjectByName(projectData.name);
    } catch (error) {
      // Revertir cambios en caso de error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al crear proyecto: ${error.message}`, error.stack);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Error al crear el proyecto');
    } finally {
      // Liberar el queryRunner
      await queryRunner.release();
    }
  }

  /**
   * Agrupa los lotes por etapa y manzana para facilitar la creación
   */
  private groupLotsByStageAndBlock(lots: LotExcelDto[]): { [stage: string]: { [block: string]: LotExcelDto[] } } {
    const result: { [stage: string]: { [block: string]: LotExcelDto[] } } = {};

    for (const lot of lots) {
      // Inicializar objetos si no existen
      if (!result[lot.stage]) {
        result[lot.stage] = {};
      }

      if (!result[lot.stage][lot.block]) {
        result[lot.stage][lot.block] = [];
      }

      // Añadir lote a su grupo
      result[lot.stage][lot.block].push(lot);
    }

    return result;
  }

  /**
   * Busca un proyecto por nombre con todas sus relaciones
   */
  async findProjectByName(name: string): Promise<Project> {
    return this.projectRepository.findOne({
      where: { name },
      relations: ['stages', 'stages.blocks', 'stages.blocks.lots'],
    });
  }
}