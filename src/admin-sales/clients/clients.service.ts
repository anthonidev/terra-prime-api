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

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly leadService: LeadService,
    private readonly guarantorService: GuarantorsService,
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
}
