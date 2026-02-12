import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateFinancingDto } from './dto/create-financing.dto';
import { UpdateParkingStatusDto } from './dto/update-parking-status.dto';
import { FinancingService } from './services/financing.service';
import { FinancingInstallmentsService } from './services/financing-installments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('financing')
export class FinancingController {
  constructor(
    private readonly financingService: FinancingService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
  ) {}

  @Post()
  create(@Body() createFinancingDto: CreateFinancingDto) {
    return this.financingService.create(createFinancingDto);
  }

  @Patch('installments/parking-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADM', 'JVE')
  updateParkingStatus(@Body() updateParkingStatusDto: UpdateParkingStatusDto) {
    return this.financingInstallmentsService.updateParkingStatus(
      updateParkingStatusDto.installmentIds,
      updateParkingStatusDto.isParked,
    );
  }
}
