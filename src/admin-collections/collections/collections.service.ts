import { Body, Injectable, Post } from '@nestjs/common';
import { ClientsService } from 'src/admin-sales/clients/clients.service';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';
import { formatClientResponse } from 'src/admin-sales/clients/helpers/format-client-response.helper';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly clientService: ClientsService,
  ){}

  async assignClientsToCollector(
    assignClientsToCollectorDto: AssignClientsToCollectorDto,
  ) {
    const clients = await this.clientService.assignClientsToCollector(
      assignClientsToCollectorDto.clientsId,
      assignClientsToCollectorDto.collectorId,
    );
    return clients.map(formatClientResponse);
  }
}
