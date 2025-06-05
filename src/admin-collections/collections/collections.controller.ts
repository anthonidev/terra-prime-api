import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';

@Controller('collections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post('assign-clients-to-collector')
  @Roles('SCO')
  assignClientsToCollector(
    @Body() assignClientsToCollectorDto: AssignClientsToCollectorDto,
  ) {
    return this.collectionsService.assignClientsToCollector(assignClientsToCollectorDto);
  }

  @Get('collectors/list')
  @Roles('SCO')
  findAllCollectors(
    @Query() paginationDto: PaginationDto,
  ) {
    return this.collectionsService.findAllCollectors(paginationDto);
  }

  @Get('clients/list-by-user')
  @Roles('COB')
  findAllClientsByUser(
    @GetUser() user: User,
  ) {
    return this.collectionsService.findAllClientsByUser(user.id);
  }

  @Get('sales/list-by-client/:clientId')
  @Roles('COB')
  findAllSalesByClient(
    @Param('clientId') clientId: number,
  ) {
    return this.collectionsService.findAllSalesByClient(clientId);
  }

  @Get('clients/sales/:saleId')
  @Roles('COB', 'SCO')
  findOneSaleByIdForClient(
    @Param('saleId') saleId: string,
  ) {
    return this.collectionsService.findOneSaleByIdForClient(saleId);
  }
}
