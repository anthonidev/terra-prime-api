import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { User } from 'src/user/entities/user.entity';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { FindAllClientsDto } from './dto/find-all-clients.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body() createClientDto: CreateClientDto,
    @GetUser() user: User,
  ) {
    return this.clientsService.create(createClientDto, user.id);
  }

  @Get()
  findAll(@Query() findAllClientsDto: FindAllClientsDto) {
    return this.clientsService.findAll(findAllClientsDto);
  }
}
