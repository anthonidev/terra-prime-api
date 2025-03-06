import {
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
import { Repository } from 'typeorm';
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

  /**
   * Crea un nuevo lote para una manzana
   */
  async createLot(createLotDto: CreateLotDto): Promise<LotDetailResponseDto> {
    try {
      // Verificar que la manzana existe
      const block = await this.blockRepository.findOne({
        where: { id: createLotDto.blockId },
        relations: ['stage', 'stage.project'],
      });

      if (!block) {
        throw new NotFoundException(
          `Manzana con ID ${createLotDto.blockId} no encontrada`,
        );
      }

      // Verificar que no exista un lote con el mismo nombre en esta manzana
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

      // Crear el lote
      const lot = this.lotRepository.create({
        name: createLotDto.name,
        area: createLotDto.area,
        lotPrice: createLotDto.lotPrice,
        urbanizationPrice: createLotDto.urbanizationPrice || 0,
        status: createLotDto.status || LotStatus.ACTIVE,
        block: { id: createLotDto.blockId },
      });

      // Guardar en la base de datos
      const savedLot = await this.lotRepository.save(lot);

      // Cargar relaciones para la respuesta
      const lotWithRelations = await this.lotRepository.findOne({
        where: { id: savedLot.id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });

      // Transformar la respuesta
      return this.transformLotToDetailDto(lotWithRelations);
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

  /**
   * Actualiza un lote existente
   */
  async updateLot(
    id: string,
    updateLotDto: UpdateLotDto,
  ): Promise<LotDetailResponseDto> {
    try {
      // Verificar que el lote existe
      const lot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });

      if (!lot) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      // Si se va a cambiar el nombre, verificar que no haya conflicto
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

      // Actualizar campos
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

      // Guardar cambios
      await this.lotRepository.save(lot);

      // Cargar lote actualizado con relaciones
      const updatedLot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });

      // Transformar la respuesta
      return this.transformLotToDetailDto(updatedLot);
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

  /**
   * Obtiene un lote por su ID
   */
  async findLotById(id: string): Promise<LotDetailResponseDto> {
    try {
      const lot = await this.lotRepository.findOne({
        where: { id },
        relations: ['block', 'block.stage', 'block.stage.project'],
      });

      if (!lot) {
        throw new NotFoundException(`Lote con ID ${id} no encontrado`);
      }

      return this.transformLotToDetailDto(lot);
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

  /**
   * Método auxiliar para transformar una entidad Lot a LotDetailResponseDto
   */
  private transformLotToDetailDto(lot: Lot): LotDetailResponseDto {
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
      projectId: lot.block.stage.project.id,
      projectName: lot.block.stage.project.name,
      projectCurrency: lot.block.stage.project.currency,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
    };
  }
}
