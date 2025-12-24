import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { User } from 'src/user/entities/user.entity';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { FindAllClientsDto } from './dto/find-all-clients.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('JVE', 'VEN', 'SCO', 'COB', 'ADM')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto, @GetUser() user: User) {
    return this.clientsService.create(createClientDto, user.id);
  }

  @Get()
  findAll(@Query() findAllClientsDto: FindAllClientsDto) {
    return this.clientsService.findAll(findAllClientsDto);
  }
}
