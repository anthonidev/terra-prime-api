import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Liner } from '../entities/liner.entity';
import { CreateLinerDto } from '../dto/liner.dto';
import { UpdateLinerDto } from '../dto/liner.dto';
import { FindLinersDto } from '../dto/find-liners.dto';
import {
  PaginatedResult,
  PaginationHelper,
} from '../../common/helpers/pagination.helper';
@Injectable()
export class LinerService {
  private readonly logger = new Logger(LinerService.name);
  constructor(
    @InjectRepository(Liner)
    private readonly linerRepository: Repository<Liner>,
  ) { }
  async create(createLinerDto: CreateLinerDto): Promise<Liner> {
    try {
      const existingLiner = await this.linerRepository.findOne({
        where: {
          document: createLinerDto.document,
          documentType: createLinerDto.documentType,
        },
      });
      if (existingLiner) {
        throw new ConflictException(
          `Ya existe un liner con el documento ${createLinerDto.documentType} ${createLinerDto.document}`,
        );
      }
      const liner = this.linerRepository.create(createLinerDto);
      return await this.linerRepository.save(liner);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error al crear liner: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear el liner');
    }
  }
  async update(id: string, updateLinerDto: UpdateLinerDto): Promise<Liner> {
    try {
      const liner = await this.linerRepository.findOne({
        where: { id },
      });
      if (!liner) {
        throw new NotFoundException(`Liner con ID ${id} no encontrado`);
      }
      if (
        (updateLinerDto.document || updateLinerDto.documentType) &&
        (updateLinerDto.document !== liner.document ||
          updateLinerDto.documentType !== liner.documentType)
      ) {
        const existingLiner = await this.linerRepository.findOne({
          where: {
            document: updateLinerDto.document || liner.document,
            documentType: updateLinerDto.documentType || liner.documentType,
          },
        });
        if (existingLiner && existingLiner.id !== id) {
          throw new ConflictException(
            `Ya existe un liner con el documento ${updateLinerDto.documentType || liner.documentType
            } ${updateLinerDto.document || liner.document}`,
          );
        }
      }
      await this.linerRepository.update(id, updateLinerDto);
      return await this.linerRepository.findOne({ where: { id } });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar liner: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar el liner');
    }
  }
  async findById(id: string): Promise<Liner> {
    try {
      const liner = await this.linerRepository.findOne({
        where: { id },
      });
      if (!liner) {
        throw new NotFoundException(`Liner con ID ${id} no encontrado`);
      }
      return liner;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error al buscar liner: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al buscar el liner');
    }
  }
  async findAll(filters: FindLinersDto): Promise<PaginatedResult<Liner>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        isActive,
        order = 'DESC',
      } = filters;
      const where: FindOptionsWhere<Liner> = {};
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        where.firstName = ILike(searchTerm);
        where.lastName = ILike(searchTerm);
        where.document = ILike(searchTerm);
      }
      const [items, totalItems] = await this.linerRepository.findAndCount({
        where,
        order: {
          createdAt: order,
        },
        skip: (page - 1) * limit,
        take: limit,
      });
      return PaginationHelper.createPaginatedResponse(
        items,
        totalItems,
        filters,
      );
    } catch (error) {
      this.logger.error(
        `Error al listar liners: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al listar los liners');
    }
  }
  async findAllActive(): Promise<Liner[]> {
    try {
      return await this.linerRepository.find({
        where: { isActive: true },
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Error al listar liners activos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al listar los liners activos',
      );
    }
  }
}
