import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../entities/lead.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import { LeadSource } from '../entities/lead-source.entity';
import { LeadVisit } from '../entities/lead-visit.entity';
import { CreateUpdateLeadDto } from '../dto/create-update-lead.dto';
import { FindLeadByDocumentDto } from '../dto/find-by-document.dto';
import { FindLeadsDto } from '../dto/find-leads.dto';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    @InjectRepository(LeadSource)
    private readonly leadSourceRepository: Repository<LeadSource>,
    @InjectRepository(LeadVisit)
    private readonly leadVisitRepository: Repository<LeadVisit>,
  ) {}
  async findByDocument(
    findDto: FindLeadByDocumentDto,
  ): Promise<{ lead: Lead; isInOffice: boolean }> {
    const { documentType, document } = findDto;
    const lead = await this.leadRepository.findOne({
      where: { documentType, document },
      relations: ['source', 'ubigeo', 'visits', 'visits.liner'],
    });
    if (!lead) {
      throw new NotFoundException(
        `No se encontró un lead con el documento ${documentType} ${document}`,
      );
    }
    return {
      lead,
      isInOffice: lead.isInOffice,
    };
  }
  async createOrUpdateLead(
    createUpdateDto: CreateUpdateLeadDto,
  ): Promise<Lead> {
    const { document, documentType } = createUpdateDto;
    let lead = await this.leadRepository.findOne({
      where: { document, documentType },
    });
    if (lead && lead.isInOffice) {
      throw new ConflictException(
        `El lead con documento ${documentType} ${document} ya se encuentra en la oficina`,
      );
    }
    if (lead) {
      const { firstName, lastName, document, documentType, ...updateFields } =
        createUpdateDto;
      const updateData: Partial<Lead> = { ...updateFields, isInOffice: true };
      if (updateFields.sourceId) {
        const source = await this.leadSourceRepository.findOne({
          where: { id: Number(updateFields.sourceId) },
        });
        if (source) {
          updateData.source = source;
        }
        delete updateData.source;
      }
      if (updateFields.ubigeoId) {
        const ubigeo = await this.ubigeoRepository.findOne({
          where: { id: updateFields.ubigeoId },
        });
        if (ubigeo) {
          updateData.ubigeo = ubigeo;
        }
        delete updateData.ubigeo;
      }
      await this.leadRepository.update(lead.id, updateData);
      lead = await this.leadRepository.findOne({
        where: { id: lead.id },
        relations: ['source', 'ubigeo'],
      });
    } else {
      const newLead = this.leadRepository.create({
        ...createUpdateDto,
        isInOffice: true,
      });
      if (createUpdateDto.sourceId) {
        const source = await this.leadSourceRepository.findOne({
          where: { id: Number(createUpdateDto.sourceId) },
        });
        if (source) {
          newLead.source = source;
        }
        delete newLead.source;
      }
      if (createUpdateDto.ubigeoId) {
        const ubigeo = await this.ubigeoRepository.findOne({
          where: { id: createUpdateDto.ubigeoId },
        });
        if (ubigeo) {
          newLead.ubigeo = ubigeo;
        }
        delete newLead.ubigeo;
      }
      lead = await this.leadRepository.save(newLead);
    }
    const visit = this.leadVisitRepository.create({
      lead,
      arrivalTime: new Date(),
    });
    await this.leadVisitRepository.save(visit);
    return this.leadRepository.findOne({
      where: { id: lead.id },
      relations: ['source', 'ubigeo', 'visits'],
    });
  }
  async findAll(filters: FindLeadsDto): Promise<PaginatedResult<Lead>> {
    const {
      page = 1,
      limit = 10,
      search,
      isInOffice,
      startDate,
      endDate,
      order = 'DESC',
    } = filters;
    const queryBuilder = this.leadRepository.createQueryBuilder('lead');
    queryBuilder
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo');
    if (search) {
      queryBuilder.andWhere(
        '(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.document ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (isInOffice !== undefined) {
      queryBuilder.andWhere('lead.isInOffice = :isInOffice', { isInOffice });
    }
    if (startDate && endDate) {
      queryBuilder.andWhere('lead.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('lead.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('lead.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }
    queryBuilder.orderBy('lead.createdAt', order);
    queryBuilder.skip((page - 1) * limit).take(limit);
    const [items, totalItems] = await queryBuilder.getManyAndCount();
    return PaginationHelper.createPaginatedResponse(items, totalItems, filters);
  }
  async findOneWithDetails(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo', 'visits', 'visits.liner'],
      order: {
        visits: {
          createdAt: 'DESC',
        },
      },
    });
    if (!lead) {
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    }
    return lead;
  }
}
