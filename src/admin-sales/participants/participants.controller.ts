import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { FindParticipantsActivesDto } from './dto/find-participants-actives.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('participants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post()
  @Roles('JVE', 'SYS')
  create(@Body() createParticipantDto: CreateParticipantDto) {
    return this.participantsService.create(createParticipantDto);
  }

  @Get()
  @Roles('JVE', 'SYS', 'REC')
  findAll() {
    return this.participantsService.findAll();
  }

  @Get(':id')
  @Roles('JVE', 'SYS')
  findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @Patch(':id')
  @Roles('JVE', 'SYS')
  update(
    @Param('id') id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(id, updateParticipantDto);
  }

  @Delete(':id')
  @Roles('JVE', 'SYS')
  remove(@Param('id') id: string) {
    return this.participantsService.remove(id);
  }

  @Get('all/actives')
  @Roles('JVE', 'SYS')
  async findAllParticipants(
    @Query() findParticipantsDto: FindParticipantsActivesDto,
  ) {
    return await this.participantsService.findAllParticipantsActives(
      findParticipantsDto,
    );
  }
}
