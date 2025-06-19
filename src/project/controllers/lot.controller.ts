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
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { UpdatePriceByVendorDto } from '../dto/update-price-by-vendor.dto';
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

  @Get('update-price-token/active')
  @Roles('SYS', 'JVE')
  async getActiveTokenInfo() {
    return this.lotService.getActiveTokenInfo();
  }

  @Post('update-price-token/create')
  @Roles('SYS', 'JVE')
  async createPricePin(
    @GetUser() user: User,
  ) {
    return this.lotService.createPinBySalesManager(user.id);
  }

  @Get('update-price-token/validate/:token')
  @Roles('SYS', 'JVE', 'VEN')
  async validateToken(
    @Param('token') token: string,
  ) {
    return this.lotService.validateToken(token);
  }
}
