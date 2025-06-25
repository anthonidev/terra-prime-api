import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { QueryRunner, Repository } from 'typeorm';
import { LeadService } from 'src/lead/services/lead.service';
import { GuarantorsService } from '../guarantors/guarantors.service';
import { ClientResponse } from './interfaces/client-response.interface';
import { formatClientResponse } from './helpers/format-client-response.helper';
import { formatClientResponseSale } from './helpers/format-client-response-sale.helper';
import { ClientSaleResponse } from './interfaces/client-sale-response.interface';
import { UsersService } from 'src/user/user.service';
import { SaleType } from '../sales/enums/sale-type.enum';
import { StatusSale } from '../sales/enums/status-sale.enum';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly leadService: LeadService,
    private readonly guarantorService: GuarantorsService,
    private readonly userService: UsersService,
  ) {}
  // Methods for endpoints
  async create(
    createClientDto: CreateClientDto,
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<ClientResponse> {
    try {
      const { leadId, address } = createClientDto;
      const repository = queryRunner
        ? queryRunner.manager.getRepository(Client)
        : this.clientRepository;
      const lead = await this.leadService.findOneById(leadId);
      if (lead.vendor.id !== userId)
        throw new NotFoundException(
          `El cliente con ID ${leadId} no se encuentra asignado al vendedor activo`,
        );
      const client = repository.create({
        lead: { id: leadId },
        address,
      });
      const savedClient = await repository.save(client);
      // const responseClient = await this.findOneById(savedClient.id);
      return formatClientResponse(savedClient);
    } catch (error) {
      throw new ConflictException(error.message);
    }
  }

  async createOrUpdate(
    createClientDto: CreateClientDto,
    userId: string,
    queryRunner?: QueryRunner,
  ): Promise<ClientResponse> {
    try {
      const { leadId, address } = createClientDto;
      const repository = queryRunner
        ? queryRunner.manager.getRepository(Client)
        : this.clientRepository;
      const lead = await this.leadService.findOneById(leadId);
      if (lead.vendor?.id !== userId)
        throw new NotFoundException(
          `El lead con ID ${leadId} no se encuentra asignado al vendedor activo`,
        );
      const client = await this.clientRepository.findOne({
        where: { lead: { id: leadId } },
        relations: ['lead'],
      });
      if (!client) {
        const client = repository.create({
          lead: { id: leadId },
          address,
        });
        const savedClient = await repository.save(client);
        return formatClientResponse(savedClient);
      }
      client.address = address;
      await repository.save(client);
      return formatClientResponse(client);
    } catch (error) {
      throw new ConflictException(error.message);
    }
  }

  async findOneById(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['lead'],
    });
    if (!client)
      throw new NotFoundException(`El cliente con ID ${id} no se encuentra registrado`);
    return client;
  }

  async findOneByDocument(document: string): Promise<ClientSaleResponse> {
    const client = await this.clientRepository.findOne({
      where: { lead: { document } },
      relations: ['lead'],
    });
    if (!client) return null;
    return formatClientResponseSale(client);
  }

  // Internal helpers methods
  async isValidClient(clientId: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, isActive: true },
    });
    if (!client)
      throw new NotFoundException(
        `El cliente con ID ${clientId} no se encuentra registrado`
      );
    return client;
  }

  async findOneClientById(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['lead', 'lead.source', 'lead.ubigeo', 'collector'],
    });

    if (!client)
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    return client;
  }

  async findAllClientsWithCollection(): Promise<Client[]> {
    const clients = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('client.collector', 'collector')
      .innerJoinAndSelect(
        'client.sales',
        'sales',
        'sales.type = :type AND sales.status = :status',
        { type: SaleType.FINANCED, status: StatusSale.IN_PAYMENT_PROCESS }
      ).getMany();
    return clients;
  }

  async findOneClientByIdWithCollections(id: number): Promise<Client> {
    const client = await this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('client.collector', 'collector')
      .innerJoinAndSelect(
        'client.sales',
        'sales',
        'sales.type = :type AND sales.status = :status',
        { type: SaleType.FINANCED, status: StatusSale.IN_PAYMENT_PROCESS }
      )
      .where('client.id = :id', { id })
      .getOne();
    
    if (!client)
      throw new NotFoundException(`Cliente con ID ${id} no disponible para asignar cobrador`);
    return client;
  }

  async assignClientsToCollector(
    clientsId: number[],
    collectorId: string
  ): Promise<Client[]> {
    const collector = await this.userService.findOneCollector(collectorId);
    const clients = await Promise.all(clientsId.map((id) => this.findOneClientByIdWithCollections(id)));

    const updatedClients = clients.map((client) => {
      client.collector = collector;
      return client;
    });

    return await this.clientRepository.save(updatedClients);
  }

  async findAllByUser(userId: string): Promise<Client[]> {
    const clients = await this.clientRepository.createQueryBuilder('client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('lead.source', 'source')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('client.collector', 'collector')
      .where('collector.id = :userId', { userId })
      .orderBy('client.createdAt', 'DESC')
      .getMany();
    return clients;
  }
}
