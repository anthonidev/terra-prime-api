import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateStageDto, UpdateStageDto } from '../dto/stage.dto';
import { StageService } from '../services/stage.service';
@Controller('stages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StageController {
  constructor(private readonly stageService: StageService) {}
  @Post()
  @Roles('SYS', 'GVE')
  async createStage(@Body() createStageDto: CreateStageDto) {
    return this.stageService.createStage(createStageDto);
  }
  @Patch(':id')
  @Roles('SYS', 'GVE')
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateStageDto,
  ) {
    return this.stageService.updateStage(id, updateStageDto);
  }
  @Get(':id')
  @Roles('SYS', 'GVE', 'VEN')
  async findOne(@Param('id') id: string) {
    return this.stageService.findStageById(id);
  }
}
