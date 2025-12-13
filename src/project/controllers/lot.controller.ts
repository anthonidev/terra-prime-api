import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateLotDto, UpdateLotDto } from '../dto/lot.dto';
import { LotService } from '../services/lot.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { UpdatePriceByVendorDto } from '../dto/update-price-by-vendor.dto';
import {
  ApiCreateLot,
  ApiUpdateLot,
  ApiFindLotById,
  ApiGetActiveTokenInfo,
  ApiCreatePricePin,
  ApiValidateToken,
} from '../decorators/lot-api.decorators';

@ApiTags('Lotes')
@Controller('lots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LotController {
  constructor(private readonly lotService: LotService) {}

  @ApiCreateLot()
  @Post()
  @Roles('SYS')
  async createLot(@Body() createLotDto: CreateLotDto) {
    return this.lotService.createLot(createLotDto);
  }

  @ApiUpdateLot()
  @Patch(':id')
  @Roles('SYS')
  async updateLot(@Param('id') id: string, @Body() updateLotDto: UpdateLotDto) {
    return this.lotService.updateLot(id, updateLotDto);
  }

  @ApiFindLotById()
  @Get(':id')
  @Roles('SYS', 'JVE', 'VEN')
  async findOne(@Param('id') id: string) {
    return this.lotService.findLotById(id);
  }

  @ApiGetActiveTokenInfo()
  @Get('admin-token/active')
  @Roles('ADM', 'JVE')
  async getActiveTokenInfo() {
    return this.lotService.getActiveTokenInfo();
  }

  @ApiCreatePricePin()
  @Post('admin-token/create')
  @Roles('ADM', 'JVE')
  async createPricePin(@GetUser() user: User) {
    return this.lotService.createPinBySalesManager(user.id);
  }

  @ApiValidateToken()
  @Get('admin-token/validate/:token')
  @Roles('SYS', 'JVE', 'VEN')
  async validateToken(@Param('token') token: string) {
    return this.lotService.validateToken(token);
  }
}
