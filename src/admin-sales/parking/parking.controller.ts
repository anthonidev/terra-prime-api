import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { FindAllParkingDto } from './dto/find-all-parking.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('parkings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Post()
  @Roles('SYS')
  create(@Body() createParkingDto: CreateParkingDto) {
    return this.parkingService.create(createParkingDto);
  }

  @Get()
  @Roles('SYS', 'JVE', 'VEN')
  findAll(@Query() findAllParkingDto: FindAllParkingDto) {
    return this.parkingService.findAll(findAllParkingDto);
  }

  @Get(':id')
  @Roles('SYS', 'JVE', 'VEN')
  findOne(@Param('id') id: string) {
    return this.parkingService.findOne(id);
  }

  @Patch(':id')
  @Roles('SYS')
  update(@Param('id') id: string, @Body() updateParkingDto: UpdateParkingDto) {
    return this.parkingService.update(id, updateParkingDto);
  }

  @Delete(':id')
  @Roles('SYS')
  remove(@Param('id') id: string) {
    return this.parkingService.remove(id);
  }
}
