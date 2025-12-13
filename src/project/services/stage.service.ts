import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateStageDto,
  StageResponseDto,
  UpdateStageDto,
} from '../dto/stage.dto';
import { Project } from '../entities/project.entity';
import { Stage } from '../entities/stage.entity';
import { StageResponse } from '../interfaces/stage-response.interface';
import { formatStageResponse } from '../helpers/format-stage-response.helper';
import { LotStatus } from '../entities/lot.entity';
@Injectable()
export class StageService {
  private readonly logger = new Logger(StageService.name);
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
  ) {}
  async createStage(createStageDto: CreateStageDto): Promise<StageResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: createStageDto.projectId },
    });
    if (!project) {
      throw new NotFoundException(
        `Proyecto con ID ${createStageDto.projectId} no encontrado`,
      );
    }
    const existingStage = await this.stageRepository.findOne({
      where: {
        name: createStageDto.name,
        project: { id: createStageDto.projectId },
      },
    });
    if (existingStage) {
      throw new ConflictException(
        `Ya existe una etapa con el nombre "${createStageDto.name}" en este proyecto`,
      );
    }
    const stage = this.stageRepository.create({
      name: createStageDto.name,
      isActive: createStageDto.isActive ?? true,
      project: { id: createStageDto.projectId },
    });
    const savedStage = await this.stageRepository.save(stage);
    const stageWithRelations = await this.stageRepository.findOne({
      where: { id: savedStage.id },
      relations: ['project', 'blocks', 'blocks.lots'],
    });
    return this.transformStageToDto(stageWithRelations);
  }
  async updateStage(
    id: string,
    updateStageDto: UpdateStageDto,
  ): Promise<StageResponseDto> {
    const stage = await this.stageRepository.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!stage) {
      throw new NotFoundException(`Etapa con ID ${id} no encontrada`);
    }
    if (updateStageDto.name && updateStageDto.name !== stage.name) {
      const existingStage = await this.stageRepository.findOne({
        where: {
          name: updateStageDto.name,
          project: { id: stage.project.id },
        },
      });
      if (existingStage) {
        throw new ConflictException(
          `Ya existe una etapa con el nombre "${updateStageDto.name}" en este proyecto`,
        );
      }
    }
    if (updateStageDto.name !== undefined) {
      stage.name = updateStageDto.name;
    }
    if (updateStageDto.isActive !== undefined) {
      stage.isActive = updateStageDto.isActive;
    }
    await this.stageRepository.save(stage);
    const updatedStage = await this.stageRepository.findOne({
      where: { id },
      relations: ['project', 'blocks', 'blocks.lots'],
    });
    return this.transformStageToDto(updatedStage);
  }
  async findStageById(id: string): Promise<StageResponseDto> {
    const stage = await this.stageRepository.findOne({
      where: { id },
      relations: ['project', 'blocks', 'blocks.lots'],
    });
    if (!stage) {
      throw new NotFoundException(`Etapa con ID ${id} no encontrada`);
    }
    return this.transformStageToDto(stage);
  }
  private transformStageToDto(stage: Stage): StageResponseDto {
    let lotCount = 0;
    stage.blocks?.forEach((block) => {
      lotCount += block.lots?.length || 0;
    });
    return {
      id: stage.id,
      name: stage.name,
      isActive: stage.isActive,
      projectId: stage.project.id,
      projectName: stage.project.name,
      blockCount: stage.blocks?.length || 0,
      lotCount,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    };
  }

  async findAllByProjectId(projectId: string): Promise<StageResponse[]> {
    const stages = await this.stageRepository
      .createQueryBuilder('stage')
      .leftJoin('stage.blocks', 'block')
      .leftJoin('block.lots', 'lot')
      .where('stage.project.id = :projectId', { projectId })
      .andWhere('stage.isActive = :isActive', { isActive: true })
      .andWhere('block.isActive = :isActive', { isActive: true })
      .andWhere('lot.status = :status', { status: LotStatus.ACTIVE })
      .groupBy('stage.id')
      .orderBy('stage.name', 'ASC')
      .getMany();

    if (!stages || stages.length === 0)
      throw new NotFoundException(
        `No se encontraron etapas con lotes activos para este proyecto`,
      );
    return stages.map(formatStageResponse);
  }
}
