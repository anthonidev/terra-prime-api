import { Body, Injectable, Post } from '@nestjs/common';
import { ClientsService } from 'src/admin-sales/clients/clients.service';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';
import { formatClientResponse } from 'src/admin-sales/clients/helpers/format-client-response.helper';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/user.service';
import { AllCollectorsActivesResponse } from './interfaces/all-collectors-actives-response.interface';
import { formatFindAllCollectors } from './helpers/format-find-all-collectors.helper';
import { Paginated } from 'src/common/interfaces/paginated.interface';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { PaginationHelper } from 'src/common/helpers/pagination.helper';
import { ClientResponse } from 'src/admin-sales/clients/interfaces/client-response.interface';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { SaleResponse } from 'src/admin-sales/sales/interfaces/sale-response.interface';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly clientService: ClientsService,
    private readonly userService: UsersService,
    private readonly saleService: SalesService,
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

  async findAllCollectors(
    paginationDto: PaginationDto,
  ): Promise<Paginated<AllCollectorsActivesResponse>> {
    const collectors = await this.userService.findAllCollectors();
    return PaginationHelper.createPaginatedResponse(
      collectors.map(formatFindAllCollectors),
      collectors.length,
      paginationDto,
    );
  }

  async findAllClientsByUser(
    userId: string,
  ): Promise<ClientResponse[]> {
    const clients = await this.clientService.findAllByUser(userId);
    const clientsFormatted = clients.map(formatClientResponse);
    return clientsFormatted.map( client => {
      const { collector, ...rest } = client;
      return rest;
    });
  }

  async findAllSalesByClient(
    clientId: number,
  ): Promise<SaleResponse[]> {
    const sales = await this.saleService.findAllByClient(clientId);
    return sales;
  }

  async findOneSaleByIdForClient(
    saleId: string,
  ): Promise<SaleResponse> {
    const sale = await this.saleService.findOneByIdWithCollections(saleId);
    return sale;
  }
}
