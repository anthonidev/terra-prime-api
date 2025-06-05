import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('assign-clients-to-collector')
    assignClientsToCollector(
      @Body() assignClientsToCollectorDto: AssignClientsToCollectorDto,
    ) {
      return this.collectionsService.assignClientsToCollector(assignClientsToCollectorDto);
    }
}
