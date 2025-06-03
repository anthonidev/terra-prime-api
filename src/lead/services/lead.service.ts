import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Raw, Repository } from 'typeorm';
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
import { UsersService } from 'src/user/user.service';
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
    private readonly userService: UsersService,
  ) { }
  async findByDocument(
    findDto: FindLeadByDocumentDto,
  ) {
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
    let departmentId = null;
    let provinceId = null;
    if (lead.ubigeo) {
      const parent = await this.ubigeoRepository.findOne({
        where: { id: lead.ubigeo.parentId },
      });
      if (parent) {
        provinceId = parent.id;
      }
      const grandParent = await this.ubigeoRepository.findOne({
        where: { id: parent?.parentId },
      });
      if (grandParent) {
        departmentId = grandParent.id;
      }
    }

    return {
      lead: {
        departmentId: departmentId || null,
        provinceId: provinceId || null,
        ...lead,
      },
      isInOffice: lead.isInOffice,

    };
  }
  async createOrUpdateLead(
    createUpdateDto: CreateUpdateLeadDto,
  ): Promise<Lead> {
    const { document, documentType, isNewLead, sourceId } = createUpdateDto;
    let lead = await this.leadRepository.findOne({
      where: { document, documentType },
    });

    if (isNewLead) {
      if (lead) {
        throw new ConflictException(
          `El lead con documento ${documentType} ${document} ya existe`,
        );
      }
    }
    delete createUpdateDto.isNewLead;

    if (lead && lead.isInOffice) {
      throw new ConflictException(
        `El lead con documento ${documentType} ${document} ya se encuentra en la oficina`,
      );
    }

    if (lead) {
      const { firstName, lastName, document, documentType, sourceId, ubigeoId, ...updateFields } =
        createUpdateDto;
      const updateData: Partial<Lead> = { ...updateFields, isInOffice: true };
      if (sourceId) {
        const source = await this.leadSourceRepository.findOne({
          where: { id: sourceId },
        });
        if (source) {
          updateData.source = source;
        }

      }
      if (ubigeoId) {
        const ubigeo = await this.ubigeoRepository.findOne({
          where: { id: ubigeoId },
        });
        if (ubigeo) {
          updateData.ubigeo = ubigeo;
        }
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
          where: { id: sourceId },
        });
        if (source) {
          newLead.source = source;
        }
      }
      if (createUpdateDto.ubigeoId) {
        const ubigeo = await this.ubigeoRepository.findOne({
          where: { id: createUpdateDto.ubigeoId },
        });
        if (ubigeo) {
          newLead.ubigeo = ubigeo;
        }
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

  async updateLead(id: string, updateDto: CreateUpdateLeadDto): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo'],
    });
    if (!lead) {
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    }
    const { sourceId, ubigeoId, isNewLead, ...updateFields } = updateDto;
    const updateData: Partial<Lead> = { ...updateFields };
    if (updateDto.sourceId) {
      const source = await this.leadSourceRepository.findOne({
        where: { id: sourceId },
      });
      if (source) {
        updateData.source = source;
      }
    }
    if (updateDto.ubigeoId) {
      const ubigeo = await this.ubigeoRepository.findOne({
        where: { id: ubigeoId },
      });
      if (ubigeo) {
        updateData.ubigeo = ubigeo;
      }
    }
    await this.leadRepository.update(lead.id, updateData);
    return this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo', 'visits', 'visits.liner'],
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

  async registerDeparture(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['visits'],
      order: {
        visits: {
          createdAt: 'DESC',
        },
      },
    });
    if (!lead) {
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    }
    if (!lead.isInOffice) {
      throw new ConflictException(
        'El lead ya se encuentra fuera de la oficina',
      );
    }
    const lastVisit = lead.visits[0];
    if (!lastVisit.departureTime) {
      lastVisit.departureTime = new Date();
      await this.leadVisitRepository.save(lastVisit);
    }
    // cambiar isInOffice a false al lead
    await this.leadRepository.update(lead.id, { isInOffice: false });

    return this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo', 'visits'],
    });
  }

  // internal helpers methods
  async findAllByDay(day: Date): Promise<Lead[]> {

    const leads = await this.leadRepository.find({
      where: {
        isInOffice: true,
        isActive: true,
      },
      relations: ['source', 'ubigeo', 'vendor'],
    });

    return leads;
  }

  async findAllByUser(userId: string): Promise<Lead[]> {

    const user = await this.userService.findOne(userId);
    const leads = await this.leadRepository.find({
      where: {
        isInOffice: true,
        isActive: true,
        vendor: { id: user.id },
      },
      relations: ['source', 'ubigeo', 'vendor'],
    });

    return leads;
  }

  // asignar leads a un vendedor:
  async assignLeadsToVendor(
    leadsId: string[],
    vendorId: string
  ): Promise<Lead[]> {
    const vendor = await this.userService.findOneVendor(vendorId);
    const leads = await Promise.all(
      leadsId.map((id) => this.findOneById(id))
    );
    const updatedLeads = leads.map((lead) => {
      lead.vendor = vendor;
      return lead;
    });
    return await this.leadRepository.save(updatedLeads);
  }

  async isValidLeadToVendor(leadId: string, vendorId: string): Promise<Lead> {
    const lead = await this.findOneById(leadId);
    if (lead.vendor.id !== vendorId)
      throw new NotFoundException(
        `El vendedor con ID ${vendorId} no se encuentra asignado en el lead`
      );
    if (!lead.isInOffice)
      throw new ConflictException(
        `El lead con ID ${leadId} no se encuentra en la oficina`
      );
    return lead;
  }

  async findOneById(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo', 'vendor']
    });
    if (!lead)
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    return lead;
  }
}
