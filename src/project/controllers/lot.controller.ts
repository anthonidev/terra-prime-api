import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateLotDto, UpdateLotDto } from '../dto/lot.dto';
import { LotService } from '../services/lot.service';

@Controller('lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LotController {
  constructor(private readonly lotService: LotService) {}

  @Post()
  @Roles('SYS', 'GVE')
  async createLot(@Body() createLotDto: CreateLotDto) {
    return this.lotService.createLot(createLotDto);
  }

  @Patch(':id')
  @Roles('SYS', 'GVE')
  async updateLot(@Param('id') id: string, @Body() updateLotDto: UpdateLotDto) {
    return this.lotService.updateLot(id, updateLotDto);
  }

  @Get(':id')
  @Roles('SYS', 'GVE', 'VEN')
  async findOne(@Param('id') id: string) {
    return this.lotService.findLotById(id);
  }
}
