import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
import { QueryRunner, Repository } from 'typeorm';
import { LotStatus } from '../dto/bulk-project-upload.dto';
import {
  CreateLotDto,
  LotDetailResponseDto,
  UpdateLotDto,
} from '../dto/lot.dto';
import { FindProjectLotsDto, LotResponseDto } from '../dto/project-lots.dto';
import { Block } from '../entities/block.entity';
import { Lot } from '../entities/lot.entity';
import { Project } from '../entities/project.entity';
import { formatLotResponse } from '../helpers/format-lot-response.helper';
import { LotResponse } from '../interfaces/lot-response.interface';
import { AdminTokenService } from './admin-token.service';
import { transformLotToDetail } from '../helpers/transform-lot-to-detail.helper';
import { FindAllLotsDto } from 'src/admin-sales/sales/dto/find-all-lots.dto';
import { Paginated } from 'src/common/interfaces/paginated.interface';
@Injectable()
export class LotService {
  private readonly logger = new Logger(LotService.name);
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    private readonly adminTokenService: AdminTokenService,
  ) {}
  async findProjectLots(
    projectId: string,
    filters: FindProjectLotsDto,
  ): Promise<PaginatedResult<LotResponseDto>> {
    try {
      const projectExists = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (!projectExists) {
        throw new NotFoundException(
          `Proyecto con ID ${projectId} no encontrado`,
        );
      }
      const {
        page = 1,
        limit = 10,
        order = 'DESC',
        stageId,
        blockId,
        status,
        search,
      } = filters;
      const queryBuilder = this.lotRepository
        .createQueryBuilder('lot')
        .leftJoinAndSelect('lot.block', 'block')
        .leftJoinAndSelect('block.stage', 'stage')
        .where('stage.project = :projectId', { projectId });
      if (stageId) {
        queryBuilder.andWhere('stage.id = :stageId', { stageId });
      }
      if (blockId) {
        queryBuilder.andWhere('block.id = :blockId', { blockId });
      }
      if (status) {
        queryBuilder.andWhere('lot.status = :status', { status });
      }
      if (search) {
        queryBuilder.andWhere(
          '(lot.name ILIKE :search OR block.name ILIKE :search OR stage.name ILIKE :search)',
          { search: `%${search}%` },
        );
      }
      queryBuilder
        .orderBy('lot.name', order)
        .skip((page - 1) * limit)
        .take(limit);
      const [items, totalItems] = await queryBuilder.getManyAndCount();
      const lotDtos: LotResponseDto[] = items.map((lot) => {
        return {
          id: lot.id,
          name: lot.name,
          area: lot.area,
          lotPrice: lot.lotPrice,
          urbanizationPrice: lot.urbanizationPrice,
          totalPrice: lot.totalPrice,
          status: lot.status,
          blockId: lot.block.id,
          blockName: lot.block.name,
          stageId: lot.block.stage.id,
          stageName: lot.block.stage.name,
          createdAt: lot.createdAt,
          updatedAt: lot.updatedAt,
        };
      });
      return PaginationHelper.createPaginatedResponse(
        lotDtos,
        totalItems,
        filters,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al buscar lotes del proyecto ${projectId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al buscar lotes del proyecto',
      );
    }
  }
  async createLot(createLotDto: CreateLotDto): Promise<LotDetailResponseDto> {
    try {
      const block = await this.blockRepository.findOne({
        where: { id: createLotDto.blockId },
        relations: ['stage', 'stage.project'],
      });
      if (!block) {
        throw new NotFoundException(
          `Manzana con ID ${createLotDto.blockId} no encontrada`,
        );
      }
      const existingLot = await this.lotRepository.findOne({
        where: {
          name: createLotDto.name,
          block: { id: createLotDto.blockId },
        },
      });
      if (existingLot) {
        throw new ConflictException(
          `Ya existe un lote con el nombre "${createLotDto.name}" en esta manzana`,
        );
      }
      const lot = this.lotRepository.create({
        name: createLotDto.name,
        area: createLotDto.area,
        lotPrice: createLotDto.lotPrice,
        urbanizationPrice: createLotDto.urbanizationPrice || 0,
        status: createLotDto.status || LotStatus.ACTIVE,
        block: { id: createLotDto.blockId },
      });
      const savedLot = await this.lotRepository.save(lot);
      const lotWithRelations = await this.lotRepository.findOne({
        where: { id: savedLot.id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });
      return transformLotToDetail(lotWithRelations);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Error al crear lote: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear el lote');
    }
  }
  async updateLot(
    id: string,
    updateLotDto: UpdateLotDto,
  ): Promise<LotDetailResponseDto> {
    try {
      const lot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });
      if (!lot) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }
      if (updateLotDto.name && updateLotDto.name !== lot.name) {
        const existingLot = await this.lotRepository.findOne({
          where: {
            name: updateLotDto.name,
            block: { id: lot.block.id },
          },
        });
        if (existingLot) {
          throw new ConflictException(
            `Ya existe un lote con el nombre "${updateLotDto.name}" en esta manzana`,
          );
        }
      }
      if (updateLotDto.name !== undefined) {
        lot.name = updateLotDto.name;
      }
      if (updateLotDto.area !== undefined) {
        lot.area = updateLotDto.area;
      }
      if (updateLotDto.lotPrice !== undefined) {
        lot.lotPrice = updateLotDto.lotPrice;
      }
      if (updateLotDto.urbanizationPrice !== undefined) {
        lot.urbanizationPrice = updateLotDto.urbanizationPrice;
      }
      if (updateLotDto.status !== undefined) {
        lot.status = updateLotDto.status;
      }
      await this.lotRepository.save(lot);
      const updatedLot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });
      return transformLotToDetail(updatedLot);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar lote ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar el lote');
    }
  }
  async findLotById(id: string): Promise<LotDetailResponseDto> {
    try {
      const lot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });
      if (!lot) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }
      return transformLotToDetail(lot);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener lote ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener el lote');
    }
  }

  async findLotsByProjectId(projectId: string, findAllLotsDto: FindAllLotsDto): Promise<Paginated<LotDetailResponseDto>> {
    const {
      // status,
      term,
      stageId,
      blockId,
      limit = 10,
      page = 1,
      order = 'ASC',
    } = findAllLotsDto;
    try {
      // Verificar que el proyecto existe
      const projectExists = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (!projectExists)
        throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
      const queryBuilder = this.lotRepository
        .createQueryBuilder('lot')
        .leftJoinAndSelect('lot.block', 'block')
        .leftJoinAndSelect('block.stage', 'stage')
        .leftJoinAndSelect('stage.project', 'project')
        .where('project.id = :projectId', { projectId })
        .andWhere('lot.status = :status', { status: LotStatus.ACTIVE });

      if (stageId)
        queryBuilder.andWhere('stage.id = :stageId', { stageId });

      if (blockId)
        queryBuilder.andWhere('block.id = :blockId', { blockId });

      if (term && term.trim()) 
        queryBuilder.andWhere(
          '(lot.name ILIKE :term OR block.name ILIKE :term OR stage.name ILIKE :term)',
          { term: `%${term.trim()}%` },
        );

      queryBuilder
        .orderBy('stage.name', 'ASC')
        .addOrderBy('block.name', 'ASC')
        .addOrderBy('lot.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);
      
      const [lots, totalItems] = await queryBuilder.getManyAndCount();
      const transformedLots = lots.map(transformLotToDetail);
      // if (!lots || totalItems === 0) return;
      return PaginationHelper.createPaginatedResponse(
        transformedLots,
        totalItems,
        { page, limit, order }
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener lotes del proyecto ${projectId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener los lotes del proyecto');
    }
  }

  // Internal helper Methods
  async findAllByBlockId(blockId: string): Promise<LotResponse[]> {
    const lots = await this.lotRepository.find({
      where: { 
        block: { id: blockId }, 
        status: LotStatus.ACTIVE 
      },
      order: { name: 'ASC' }
    });
    
    if (!lots || lots.length === 0)
      throw new NotFoundException(`No se encontraron lotes activos para esta manzana`);
    return lots.map(formatLotResponse);
  }

  async isLotValidForSale(lotId: string): Promise<Lot> {
    const lot = await this.lotRepository.findOne({
      where: { id: lotId },
    });
    if (!lot)
      throw new NotFoundException(`El lote no se encuentra registrado`);
    if(lot.status === LotStatus.INACTIVE)
      throw new BadRequestException(`El lote ${lot.name} no se encuentra activado`);
    if(lot.status === LotStatus.RESERVED)
      throw new BadRequestException(`El lote ${lot.name} está reservado`);
    if(lot.status === LotStatus.SOLD)
      throw new BadRequestException(`El lote ${lot.name} ya se ha vendido`);
    return lot;
  }

  async isLotValidForSaleReservation(lotId: string): Promise<Lot> {
    const lot = await this.lotRepository.findOne({
      where: { id: lotId },
    });
    if (!lot)
      throw new NotFoundException(`El lote ${lot.name} no se encuentra separado`);
    if(lot.status === LotStatus.INACTIVE)
      throw new BadRequestException(`El lote ${lot.name} no se encuentra activado`);
    if(lot.status === LotStatus.RESERVED)
      throw new BadRequestException(`El lote ${lot.name} está reservado`);
    if(lot.status === LotStatus.SOLD)
      throw new BadRequestException(`El lote ${lot.name} ya se ha vendido`);
    return lot;
  }

  async updateStatus(
    id: string,
    status: LotStatus,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Lot)
      : this.lotRepository;
    await repository.update({ id }, { status });
  }

  async getActiveTokenInfo(): Promise<{ pin: string | null; expiresAt?: Date }> {
    return await this.adminTokenService.getActiveTokenInfo();
  }

  async createPinBySalesManager(
    userId: string,
  ): Promise<{ pin: string }> {
    return await this.adminTokenService.createPin(userId);
  }

  async validateToken(token: string): Promise<boolean> {
    return await this.adminTokenService.validateToken(token);
  }
}
