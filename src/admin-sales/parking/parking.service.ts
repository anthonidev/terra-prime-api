import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Parking } from './entities/parking.entity';
import { CreateParkingDto, CreateParkingResponseDto } from './dto/create-parking.dto';
import { UpdateParkingDto, UpdateParkingResponseDto } from './dto/update-parking.dto';
import { FindAllParkingDto, FindAllParkingResponseDto } from './dto/find-all-parking.dto';
import { Project } from 'src/project/entities/project.entity';
import { LotStatus } from 'src/project/entities/lot.entity';
import { PaginationHelper, PaginatedResult } from 'src/common/helpers/pagination.helper';
import { formatParkingResponse } from './helpers/format-parking-response.helper';

@Injectable()
export class ParkingService {
  private readonly logger = new Logger(ParkingService.name);

  constructor(
    @InjectRepository(Parking)
    private readonly parkingRepository: Repository<Parking>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createParkingDto: CreateParkingDto): Promise<CreateParkingResponseDto> {
    try {
      const { name, area, price, projectId, currency, status } = createParkingDto;

      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
      }

      const existing = await this.parkingRepository.findOne({
        where: { name, project: { id: projectId } },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una cochera con el nombre "${name}" en este proyecto`,
        );
      }

      const parking = this.parkingRepository.create({
        name,
        area,
        price,
        project: { id: projectId },
        ...(currency && { currency }),
        ...(status && { status }),
      });

      const saved = await this.parkingRepository.save(parking);

      const parkingWithRelations = await this.parkingRepository.findOne({
        where: { id: saved.id },
        relations: ['project'],
      });

      return formatParkingResponse(parkingWithRelations);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`Error al crear cochera: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error al crear la cochera');
    }
  }

  async findAll(findAllParkingDto: FindAllParkingDto): Promise<PaginatedResult<FindAllParkingResponseDto> | { items: FindAllParkingResponseDto[] }> {
    try {
      const {
        page = 1,
        limit = 10,
        order = 'DESC',
        term,
        projectId,
        status,
        minPrice,
        maxPrice,
        hasPagination = true,
      } = findAllParkingDto;

      const queryBuilder = this.parkingRepository
        .createQueryBuilder('parking')
        .leftJoinAndSelect('parking.project', 'project');

      if (projectId) {
        queryBuilder.andWhere('project.id = :projectId', { projectId });
      }

      if (status) {
        queryBuilder.andWhere('parking.status = :status', { status });
      }

      if (term && term.trim()) {
        queryBuilder.andWhere('parking.name ILIKE :term', {
          term: `%${term.trim()}%`,
        });
      }

      if (minPrice !== undefined) {
        queryBuilder.andWhere('parking.price >= :minPrice', { minPrice });
      }

      if (maxPrice !== undefined) {
        queryBuilder.andWhere('parking.price <= :maxPrice', { maxPrice });
      }

      queryBuilder.orderBy('parking.createdAt', order);

      if (!hasPagination) {
        const items = await queryBuilder.getMany();
        return { items: items.map(formatParkingResponse) };
      }

      queryBuilder.skip((page - 1) * limit).take(limit);
      const [items, totalItems] = await queryBuilder.getManyAndCount();

      return PaginationHelper.createPaginatedResponse(
        items.map(formatParkingResponse),
        totalItems,
        { page, limit, order },
      );
    } catch (error) {
      this.logger.error(
        `Error al buscar cocheras: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al buscar cocheras');
    }
  }

  async findOne(id: string): Promise<FindAllParkingResponseDto> {
    try {
      const parking = await this.parkingRepository.findOne({
        where: { id },
        relations: ['project'],
      });
      if (!parking) {
        throw new NotFoundException(`Cochera con ID ${id} no encontrada`);
      }
      return formatParkingResponse(parking);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error al obtener cochera ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener la cochera');
    }
  }

  async update(id: string, updateParkingDto: UpdateParkingDto): Promise<UpdateParkingResponseDto> {
    try {
      const parking = await this.parkingRepository.findOne({
        where: { id },
        relations: ['project'],
      });
      if (!parking) {
        throw new NotFoundException(`Cochera con ID ${id} no encontrada`);
      }

      if (parking.status !== LotStatus.ACTIVE) {
        throw new ConflictException(
          `Solo se pueden editar cocheras con estado Activo`,
        );
      }

      if (updateParkingDto.name && updateParkingDto.name !== parking.name) {
        const existing = await this.parkingRepository.findOne({
          where: {
            name: updateParkingDto.name,
            project: { id: parking.project.id },
          },
        });
        if (existing) {
          throw new ConflictException(
            `Ya existe una cochera con el nombre "${updateParkingDto.name}" en este proyecto`,
          );
        }
      }

      if (updateParkingDto.name !== undefined) parking.name = updateParkingDto.name;
      if (updateParkingDto.area !== undefined) parking.area = updateParkingDto.area;
      if (updateParkingDto.price !== undefined) parking.price = updateParkingDto.price;
      if (updateParkingDto.currency !== undefined) parking.currency = updateParkingDto.currency;
      if (updateParkingDto.status !== undefined) parking.status = updateParkingDto.status;

      await this.parkingRepository.save(parking);

      const updated = await this.parkingRepository.findOne({
        where: { id },
        relations: ['project'],
      });

      return formatParkingResponse(updated);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al actualizar cochera ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al actualizar la cochera');
    }
  }

  async updateStatus(
    id: string,
    status: LotStatus,
    queryRunner?: QueryRunner,
  ) {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Parking)
      : this.parkingRepository;
    await repository.update({ id }, { status });
  }

  async remove(id: string): Promise<UpdateParkingResponseDto> {
    try {
      const parking = await this.parkingRepository.findOne({
        where: { id },
        relations: ['project'],
      });
      if (!parking) {
        throw new NotFoundException(`Cochera con ID ${id} no encontrada`);
      }

      if (parking.status !== LotStatus.ACTIVE) {
        throw new ConflictException(
          `Solo se pueden desactivar cocheras con estado Activo`,
        );
      }

      await this.updateStatus(id, LotStatus.INACTIVE);

      parking.status = LotStatus.INACTIVE;
      return formatParkingResponse(parking);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al eliminar cochera ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al eliminar la cochera');
    }
  }
}
