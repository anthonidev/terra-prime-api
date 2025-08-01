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
  BlockResponseDto,
  CreateBlockDto,
  UpdateBlockDto,
} from '../dto/block.dto';
import { Block } from '../entities/block.entity';
import { Stage } from '../entities/stage.entity';
import { formatBlockResponse } from '../helpers/format-block-response.helper';
import { BlockResponse } from '../interfaces/block-response.interface';
import { LotStatus } from '../entities/lot.entity';
@Injectable()
export class BlockService {
  private readonly logger = new Logger(BlockService.name);
  constructor(
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(Stage)
    private readonly stageRepository: Repository<Stage>,
  ) {}
  async createBlock(createBlockDto: CreateBlockDto): Promise<BlockResponseDto> {
    try {
      const stage = await this.stageRepository.findOne({
        where: { id: createBlockDto.stageId },
        relations: ['project'],
      });
      if (!stage) {
        throw new NotFoundException(
          `Etapa con ID ${createBlockDto.stageId} no encontrada`,
        );
      }
      const existingBlock = await this.blockRepository.findOne({
        where: {
          name: createBlockDto.name,
          stage: { id: createBlockDto.stageId },
        },
      });
      if (existingBlock) {
        throw new ConflictException(
          `Ya existe una manzana con el nombre "${createBlockDto.name}" en esta etapa`,
        );
      }
      const block = this.blockRepository.create({
        name: createBlockDto.name,
        isActive: createBlockDto.isActive ?? true,
        stage: { id: createBlockDto.stageId },
      });
      const savedBlock = await this.blockRepository.save(block);
      const blockWithRelations = await this.blockRepository.findOne({
        where: { id: savedBlock.id },
        relations: ['stage', 'stage.project', 'lots'],
      });
      return this.transformBlockToDto(blockWithRelations);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al crear manzana: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear la manzana');
    }
  }
  async updateBlock(
    id: string,
    updateBlockDto: UpdateBlockDto,
  ): Promise<BlockResponseDto> {
    try {
      const block = await this.blockRepository.findOne({
        where: { id },
        relations: ['stage', 'stage.project'],
      });
      if (!block) {
        throw new NotFoundException(`Manzana con ID ${id} no encontrada`);
      }
      if (updateBlockDto.name && updateBlockDto.name !== block.name) {
        const existingBlock = await this.blockRepository.findOne({
          where: {
            name: updateBlockDto.name,
            stage: { id: block.stage.id },
          },
        });
        if (existingBlock) {
          throw new ConflictException(
            `Ya existe una manzana con el nombre "${updateBlockDto.name}" en esta etapa`,
          );
        }
      }
      if (updateBlockDto.name !== undefined) {
        block.name = updateBlockDto.name;
      }
      if (updateBlockDto.isActive !== undefined) {
        block.isActive = updateBlockDto.isActive;
      }
      await this.blockRepository.save(block);
      const updatedBlock = await this.blockRepository.findOne({
        where: { id },
        relations: ['stage', 'stage.project', 'lots'],
      });
      return this.transformBlockToDto(updatedBlock);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar manzana ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar la manzana');
    }
  }
  async findBlockById(id: string): Promise<BlockResponseDto> {
    try {
      const block = await this.blockRepository.findOne({
        where: { id },
        relations: ['stage', 'stage.project', 'lots'],
      });
      if (!block) {
        throw new NotFoundException(`Manzana con ID ${id} no encontrada`);
      }
      return this.transformBlockToDto(block);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener manzana ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener la manzana');
    }
  }
  private transformBlockToDto(block: Block): BlockResponseDto {
    return {
      id: block.id,
      name: block.name,
      isActive: block.isActive,
      stageId: block.stage.id,
      stageName: block.stage.name,
      projectId: block.stage.project.id,
      projectName: block.stage.project.name,
      lotCount: block.lots?.length || 0,
      activeLots:
        block.lots?.filter((lot) => lot.status === 'Activo').length || 0,
      reservedLots:
        block.lots?.filter((lot) => lot.status === 'Separado').length || 0,
      soldLots:
        block.lots?.filter((lot) => lot.status === 'Vendido').length || 0,
      inactiveLots:
        block.lots?.filter((lot) => lot.status === 'Inactivo').length || 0,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }

  // Internal helper Methods
  async findAllByStageId(stageId: string): Promise<BlockResponse[]> {
    const blocks = await this.blockRepository
      .createQueryBuilder('block')
      .leftJoin('block.lots', 'lot')
      .where('block.stage.id = :stageId', { stageId })
      .andWhere('block.isActive = :isActive', { isActive: true })
      .andWhere('lot.status = :status', { status: LotStatus.ACTIVE })
      .groupBy('block.id')
      .orderBy('block.name', 'ASC')
      .getMany();
    if (!blocks || blocks.length === 0)
      throw new NotFoundException(`No se encontraron manzanas con lotes activos para esta etapa`);
    return blocks.map(formatBlockResponse);
  }
}
