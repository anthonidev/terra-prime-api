import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, QueryRunner, Repository } from 'typeorm';
import { Lead } from '../entities/lead.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import { LeadSource } from '../entities/lead-source.entity';
import { LeadVisit } from '../entities/lead-visit.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { CreateUpdateLeadDto } from '../dto/create-update-lead.dto';
import { FindLeadByDocumentDto } from '../dto/find-by-document.dto';
import { FindLeadsDto } from '../dto/find-leads.dto';
import {
  PaginatedResult,
  PaginationHelper,
} from 'src/common/helpers/pagination.helper';
import { UsersService } from 'src/user/user.service';
import { TransactionService } from 'src/common/services/transaction.service';
import { CutsResponse } from 'src/cuts/interfaces/cuts-response.interface';
import { AssignParticipantsToLeadVisitDto } from '../dto/assign-participants-to-lead-visit.dto';
import { ParticipantType } from 'src/admin-sales/participants/entities/participant.entity';
import { ParticipantsService } from 'src/admin-sales/participants/participants.service';
import { formatLeadWithParticipants } from '../helpers/format-lead-participnats-response.helper';
import { formatLeadWithParticipantsSummary } from '../helpers/format-lead-participnats-summary-response.helper';
import { LeadSummaryResponse, LeadWithParticipantsResponse } from '../interfaces/lead-formatted-response.interface';
@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    @InjectRepository(LeadSource)
    private readonly leadSourceRepository: Repository<LeadSource>,
    @InjectRepository(LeadVisit)
    private readonly leadVisitRepository: Repository<LeadVisit>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly userService: UsersService,
    private readonly transactionService: TransactionService,
    private readonly participantsService: ParticipantsService,
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
  ): Promise<LeadWithParticipantsResponse> {
    const { document, documentType, isNewLead, sourceId } = createUpdateDto;
    let lead = await this.leadRepository.findOne({
      where: { document, documentType },
    });

    if (isNewLead) {
      if (lead)
        throw new ConflictException(
          `El lead con documento ${documentType} ${document} ya existe`,
        );
      }
    delete createUpdateDto.isNewLead;

    if (lead) {
      const { 
        firstName, 
        lastName, 
        document, 
        documentType, 
        sourceId, 
        ubigeoId, 
        ...updateFields 
      } = createUpdateDto;
      
      const updateData: Partial<Lead> = { 
        ...updateFields, 
        isInOffice: true 
      };
      
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
        if (ubigeo) newLead.ubigeo = ubigeo;
      }
      lead = await this.leadRepository.save(newLead);
    }
    
    const visit = this.leadVisitRepository.create({
      lead,
      arrivalTime: new Date(),
    });
    await this.leadVisitRepository.save(visit);
    
    const leadSaved = await this.findOneById(lead.id);
    return formatLeadWithParticipants(leadSaved);
  }

  async updateLead(id: string, updateDto: CreateUpdateLeadDto)
  : Promise<LeadWithParticipantsResponse> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['source', 'ubigeo'],
    });
    
    if (!lead)
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    
    const { sourceId, ubigeoId, isNewLead, ...updateFields } = updateDto;
    const updateData: Partial<Lead> = { ...updateFields };
    
    if (updateDto.sourceId) {
      const source = await this.leadSourceRepository.findOne({
        where: { id: sourceId },
      });
      if (source) updateData.source = source;
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
    const leadWithParticipants = await this.findOneById(lead.id);
    return formatLeadWithParticipants(leadWithParticipants);
  }

  async findAll(filters: FindLeadsDto)
  : Promise<PaginatedResult<LeadSummaryResponse>> {
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
      .addSelect('lead.updatedAt')
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('lead.visits', 'visits');
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
    queryBuilder
      .orderBy('lead.isInOffice', 'DESC')
      .addOrderBy('lead.updatedAt', 'DESC')
      .addOrderBy('lead.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit).take(limit);
    const [items, totalItems] = await queryBuilder.getManyAndCount();
    const formattedLeads = items.map(formatLeadWithParticipantsSummary);
    return PaginationHelper.createPaginatedResponse(formattedLeads, totalItems, filters);
  }

  async findOneWithDetails(id: string): Promise<LeadWithParticipantsResponse> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      order: {
        visits: {
          createdAt: 'DESC',
        },
      },
      relations: [
        'source',
        'ubigeo',
        'vendor',
        'visits',
        'visits.liner',
        'visits.linerParticipant',
        'visits.telemarketingSupervisor',
        'visits.telemarketingConfirmer',
        'visits.telemarketer',
        'visits.fieldManager',
        'visits.fieldSupervisor',
        'visits.fieldSeller',
        'visits.salesManager',
        'visits.salesGeneralManager',
        'visits.postSale',
        'visits.closer',
        'visits.generalDirector',
      ]
    });
    if (!lead) {
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);
    }
    return formatLeadWithParticipants(lead);
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
  async findAllByDay(day: Date): Promise<LeadWithParticipantsResponse[]> {
    const leads = await this.leadRepository.find({
      where: { isInOffice: true,
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
        visits: {
          createdAt: 'DESC',
        },
      },
      relations: [
        'source',
        'ubigeo',
        'vendor',
        'visits',
        'visits.liner',
        'visits.linerParticipant',
        'visits.telemarketingSupervisor',
        'visits.telemarketingConfirmer',
        'visits.telemarketer',
        'visits.fieldManager',
        'visits.fieldSupervisor',
        'visits.fieldSeller',
        'visits.salesGeneralManager',
        'visits.salesManager',
        'visits.postSale',
        'visits.closer',
        'visits.generalDirector',
      ]
    });
    return leads.map(formatLeadWithParticipants);
  }

  async findAllByUser(userId: string): Promise<LeadWithParticipantsResponse[]> {
    const user = await this.userService.findOne(userId);
    const leads = await this.leadRepository.find({
      where: { isInOffice: true,
        isActive: true,
        vendor: { id: user.id }, },
      order: {
        createdAt: 'DESC',
        visits: {
          createdAt: 'DESC',
        },
      },
      relations: [
        'source',
        'ubigeo',
        'vendor',
        'visits',
        'visits.liner',
        'visits.linerParticipant',
        'visits.telemarketingSupervisor',
        'visits.telemarketingConfirmer',
        'visits.telemarketer',
        'visits.fieldManager',
        'visits.fieldSupervisor',
        'visits.fieldSeller',
        'visits.salesGeneralManager',
        'visits.salesManager',
        'visits.postSale',
        'visits.closer',
        'visits.generalDirector',
      ]
    });
    return leads.map(formatLeadWithParticipants);
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

  async assignParticipantsToLeadVisit(
    leadVisitId: string,
    assignParticipantsDto: AssignParticipantsToLeadVisitDto,
  ) {
    try {
      // Mapeo de campos DTO a validaciones de tipo
      const participantValidations = [
        { id: assignParticipantsDto.linerParticipantId, type: ParticipantType.LINER, field: 'linerParticipant' },
        { id: assignParticipantsDto.telemarketingSupervisorId, type: ParticipantType.TELEMARKETING_SUPERVISOR, field: 'telemarketingSupervisor' },
        { id: assignParticipantsDto.telemarketingConfirmerId, type: ParticipantType.TELEMARKETING_CONFIRMER, field: 'telemarketingConfirmer' },
        { id: assignParticipantsDto.telemarketerId, type: ParticipantType.TELEMARKETER, field: 'telemarketer' },
        { id: assignParticipantsDto.fieldManagerId, type: ParticipantType.FIELD_MANAGER, field: 'fieldManager' },
        { id: assignParticipantsDto.fieldSupervisorId, type: ParticipantType.FIELD_SUPERVISOR, field: 'fieldSupervisor' },
        { id: assignParticipantsDto.fieldSellerId, type: ParticipantType.FIELD_SELLER, field: 'fieldSeller' },
        { id: assignParticipantsDto.salesGeneralManagerId, type: ParticipantType.SALES_GENERAL_MANAGER, field: 'salesGeneralManager' },
        { id: assignParticipantsDto.salesManagerId, type: ParticipantType.SALES_MANAGER, field: 'salesManager' },
        { id: assignParticipantsDto.postSaleId, type: ParticipantType.POST_SALE, field: 'postSale' },
        { id: assignParticipantsDto.closerId, type: ParticipantType.CLOSER, field: 'closer' },
        { id: assignParticipantsDto.generalDirectorId, type: ParticipantType.GENERAL_DIRECTOR, field: 'generalDirector' },
      ];

      // Validar participantes que se están asignando
      await Promise.all(participantValidations
        .filter(({ id }) => id !== undefined && id !== null)
        .map(({ id, type }) => this.participantsService.validateParticipantByType(id, type)));

      // Preparar datos para preload
      const updateData: any = { id: leadVisitId };

      participantValidations.forEach(({ id, field }) => {
        if (id !== undefined) {
          updateData[field] = id ? { id } : null;
        }
      });

      // Usar preload para actualizar
      const leadVisitToUpdate = await this.leadVisitRepository.preload(updateData);

      if (!leadVisitToUpdate)
        throw new NotFoundException(`La visita con ID ${leadVisitId} no se encuentra registrada`);

      await this.leadVisitRepository.save(leadVisitToUpdate);

      // Retornar la visita actualizada con sus relaciones
      const leadVisit = await this.leadVisitRepository.findOne({
        where: { id: leadVisitId },
        relations: [
          'lead',
          'linerParticipant',
          'telemarketingSupervisor',
          'telemarketingConfirmer',
          'telemarketer',
          'fieldManager',
          'fieldSupervisor',
          'fieldSeller',
          'salesManager',
          'salesGeneralManager',
          'postSale',
          'closer',
          'generalDirector',
        ]
      });

      // Sincronizar participantes con las ventas asociadas a este leadVisit
      await this.syncParticipantsToSales(leadVisitId, leadVisit);

      return leadVisit;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al asignar participantes a la visita: ${error.message}`);
    }
  }

  async findLastVisitByLeadId(leadId: string): Promise<LeadVisit | null> {
    return await this.leadVisitRepository.findOne({
      where: { lead: { id: leadId } },
      order: { createdAt: 'DESC' },
      relations: [
        'linerParticipant',
        'telemarketingSupervisor',
        'telemarketingConfirmer',
        'telemarketer',
        'fieldManager',
        'fieldSupervisor',
        'fieldSeller',
        'salesManager',
        'salesGeneralManager',
        'postSale',
        'closer',
        'generalDirector',
      ]
    });
  }

  async findOneById(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: [
        'source',
        'ubigeo',
        'vendor'
      ]
    });

    if (!lead)
      throw new NotFoundException(`Lead con ID ${id} no encontrado`);

    return lead;
  }

  async updateIsOfficeAndAssignVendor(): Promise<CutsResponse> {
    return await this.transactionService.runInTransaction(async (queryRunner) => {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let totalPoints = 0;

    try {
      // Ejecutar ambas operaciones y capturar sus resultados
      const [isOfficeResult, desassignVendorResult] = await Promise.all([
        this.updateIsOffice(queryRunner),
        this.updateDesassignVendor(queryRunner),
      ]);

      // Sumar los resultados
      processed = isOfficeResult.processed + desassignVendorResult.processed;
      successful = isOfficeResult.successful + desassignVendorResult.successful;
      failed = isOfficeResult.failed + desassignVendorResult.failed;
      totalPoints = isOfficeResult.totalPoints + desassignVendorResult.totalPoints;

      return { processed, successful, failed, totalPoints };
    } catch (error) {
      // Manejar errores si es necesario
      throw error;
    }
  });
  }

  async updateIsOffice(
  queryRunner?: QueryRunner,
  ): Promise<CutsResponse> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Lead)
      : this.leadRepository;
    const leadVisitRepository = queryRunner
      ? queryRunner.manager.getRepository(LeadVisit)
      : this.leadVisitRepository;
    const leadsIsInOffice = await repository.find({
      where: { isInOffice: true },
      relations: ['visits'],
      order: {
        visits: {
          createdAt: 'DESC',
        },
      },
    });
    if (leadsIsInOffice.length === 0) {
      this.logger.log('No hay leads con isOffice en true para actualizar.');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        totalPoints: 0
      };
    }
    const updatedLeads = leadsIsInOffice.map(lead => {
      lead.isInOffice = false;
      return lead;
    });
    try {
      // Actualizar los leads
      await repository.save(updatedLeads);
      // Actualizar el departureTime del último visit de cada lead
      const currentDate = new Date();
      const visitsToUpdate: LeadVisit[] = [];
      for (const lead of leadsIsInOffice) {
        if (lead.visits && lead.visits.length > 0) {
          const lastVisit = lead.visits[0]; // Ya está ordenado DESC
          if (!lastVisit.departureTime) {
            lastVisit.departureTime = currentDate;
            visitsToUpdate.push(lastVisit);
          }
        }
      }
      if (visitsToUpdate.length > 0) {
        await leadVisitRepository.save(visitsToUpdate);
        this.logger.log(`Se actualizaron ${visitsToUpdate.length} visitas con departureTime.`);
      }
      this.logger.log(`Se actualizaron ${updatedLeads.length} leads: isOffice cambió a false.`);
      return {
        processed: updatedLeads.length,
        successful: updatedLeads.length,
        failed: 0,
        totalPoints: updatedLeads.length
      };
    } catch (error) {
      this.logger.error(`Error al actualizar isOffice: ${error.message}`);
      return {
        processed: updatedLeads.length,
        successful: 0,
        failed: updatedLeads.length,
        totalPoints: 0
      };
    }
  }

  async updateDesassignVendor(
    queryRunner?: QueryRunner,
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    totalPoints: number;
  }> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Lead)
      : this.leadRepository;
    
    const updatedLeadsWithVendor = await repository.find({
      where: { vendor: Not(IsNull()) },
      relations: ['vendor'],
    });
    
    if (updatedLeadsWithVendor.length === 0) {
      this.logger.log('No hay leads con vendor para actualizar.');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        totalPoints: 0
      };
    }

    const updatedLeadsWithVendorIds = updatedLeadsWithVendor.map(lead => {
      lead.vendor = null;
      return lead;
    });

    try {
      await repository.save(updatedLeadsWithVendorIds);
      this.logger.log(`Se actualizaron ${updatedLeadsWithVendorIds.length} leads: vendor cambió a null.`);
      
      return {
        processed: updatedLeadsWithVendorIds.length,
        successful: updatedLeadsWithVendorIds.length,
        failed: 0,
        totalPoints: updatedLeadsWithVendorIds.length // O algún cálculo específico si aplica
      };
    } catch (error) {
      this.logger.error(`Error al desasignar vendor: ${error.message}`);
      
      return {
        processed: updatedLeadsWithVendorIds.length,
        successful: 0,
        failed: updatedLeadsWithVendorIds.length,
        totalPoints: 0
      };
    }
  }

  // ========== MÉTODOS DE SINCRONIZACIÓN BIDIRECCIONAL ==========

  /**
   * Sincroniza los participantes del leadVisit con las ventas asociadas
   * Se llama cuando se actualizan participantes en un leadVisit
   */
  private async syncParticipantsToSales(leadVisitId: string, leadVisit: LeadVisit): Promise<void> {
    try {
      // Buscar ventas que tienen este leadVisit
      const sales = await this.saleRepository.find({
        where: { leadVisit: { id: leadVisitId } }
      });

      if (sales.length === 0) return;

      // Actualizar cada venta con los participantes del leadVisit
      for (const sale of sales) {
        await this.saleRepository.update(sale.id, {
          liner: leadVisit.linerParticipant || null,
          telemarketingSupervisor: leadVisit.telemarketingSupervisor || null,
          telemarketingConfirmer: leadVisit.telemarketingConfirmer || null,
          telemarketer: leadVisit.telemarketer || null,
          fieldManager: leadVisit.fieldManager || null,
          fieldSupervisor: leadVisit.fieldSupervisor || null,
          fieldSeller: leadVisit.fieldSeller || null,
          salesManager: leadVisit.salesManager || null,
          salesGeneralManager: leadVisit.salesGeneralManager || null,
          postSale: leadVisit.postSale || null,
          closer: leadVisit.closer || null,
          generalDirector: leadVisit.generalDirector || null,
        });
      }

      this.logger.log(`Sincronizados participantes del leadVisit ${leadVisitId} a ${sales.length} venta(s)`);
    } catch (error) {
      this.logger.error(`Error al sincronizar participantes a ventas: ${error.message}`);
    }
  }

  /**
   * Actualiza los participantes del leadVisit desde una venta (sincronización inversa)
   * Se llama desde el SalesService cuando se actualizan participantes en una venta
   * No sincroniza de vuelta a las ventas para evitar loops
   */
  async updateLeadVisitParticipantsFromSale(
    leadVisitId: string,
    participants: {
      linerId?: string | null;
      telemarketingSupervisorId?: string | null;
      telemarketingConfirmerId?: string | null;
      telemarketerId?: string | null;
      fieldManagerId?: string | null;
      fieldSupervisorId?: string | null;
      fieldSellerId?: string | null;
      salesManagerId?: string | null;
      salesGeneralManagerId?: string | null;
      postSaleId?: string | null;
      closerId?: string | null;
      generalDirectorId?: string | null;
    }
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (participants.linerId !== undefined) {
        updateData.linerParticipant = participants.linerId ? { id: participants.linerId } : null;
      }
      if (participants.telemarketingSupervisorId !== undefined) {
        updateData.telemarketingSupervisor = participants.telemarketingSupervisorId ? { id: participants.telemarketingSupervisorId } : null;
      }
      if (participants.telemarketingConfirmerId !== undefined) {
        updateData.telemarketingConfirmer = participants.telemarketingConfirmerId ? { id: participants.telemarketingConfirmerId } : null;
      }
      if (participants.telemarketerId !== undefined) {
        updateData.telemarketer = participants.telemarketerId ? { id: participants.telemarketerId } : null;
      }
      if (participants.fieldManagerId !== undefined) {
        updateData.fieldManager = participants.fieldManagerId ? { id: participants.fieldManagerId } : null;
      }
      if (participants.fieldSupervisorId !== undefined) {
        updateData.fieldSupervisor = participants.fieldSupervisorId ? { id: participants.fieldSupervisorId } : null;
      }
      if (participants.fieldSellerId !== undefined) {
        updateData.fieldSeller = participants.fieldSellerId ? { id: participants.fieldSellerId } : null;
      }
      if (participants.salesManagerId !== undefined) {
        updateData.salesManager = participants.salesManagerId ? { id: participants.salesManagerId } : null;
      }
      if (participants.salesGeneralManagerId !== undefined) {
        updateData.salesGeneralManager = participants.salesGeneralManagerId ? { id: participants.salesGeneralManagerId } : null;
      }
      if (participants.postSaleId !== undefined) {
        updateData.postSale = participants.postSaleId ? { id: participants.postSaleId } : null;
      }
      if (participants.closerId !== undefined) {
        updateData.closer = participants.closerId ? { id: participants.closerId } : null;
      }
      if (participants.generalDirectorId !== undefined) {
        updateData.generalDirector = participants.generalDirectorId ? { id: participants.generalDirectorId } : null;
      }

      if (Object.keys(updateData).length > 0) {
        await this.leadVisitRepository.update(leadVisitId, updateData);
        this.logger.log(`Sincronizados participantes de venta al leadVisit ${leadVisitId}`);
      }
    } catch (error) {
      this.logger.error(`Error al sincronizar participantes al leadVisit: ${error.message}`);
    }
  }
}
