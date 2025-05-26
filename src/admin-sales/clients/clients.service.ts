import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm';
import { LeadService } from 'src/lead/services/lead.service';
import { GuarantorsService } from '../guarantors/guarantors.service';
import { ClientResponse } from './interfaces/client-response.interface';
import { formatClientResponse } from './helpers/format-client-response.helper';

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
  ): Promise<ClientResponse> {
    try {
      const { leadId, guarantorId, address } = createClientDto;
      const lead = await this.leadService.findOneById(leadId);
      const guarantor = guarantorId ? await this.guarantorService.findOneById(guarantorId) : undefined;
      if (lead.vendor.id !== userId)
        throw new NotFoundException(
          `El cliente con ID ${leadId} no se encuentra asignado al vendedor activo`,
        );
      const client = this.clientRepository.create({
        lead: { id: leadId },
        address,
        guarantor: guarantor ? { id: guarantor.id } : undefined,
      });
      const savedClient = await this.clientRepository.save(client);
      const responseClient = await this.findOneById(savedClient.id);
      return formatClientResponse(responseClient);
    } catch (error) {
      throw new ConflictException(error.message);
    }
  }

  async findOneById(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['lead', 'lead.ubigeo', 'lead.source', 'guarantor'],
    });
    if (!client)
      throw new NotFoundException(`El cliente con ID ${id} no se encuentra registrado`);
    return client;
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
