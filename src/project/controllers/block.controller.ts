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
import { CreateBlockDto, UpdateBlockDto } from '../dto/block.dto';
import { BlockService } from '../services/block.service';
@Controller('blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlockController {
  constructor(private readonly blokService: BlockService) {}
  @Post()
  @Roles('SYS')
  async createBlock(@Body() createBlockDto: CreateBlockDto) {
    return this.blokService.createBlock(createBlockDto);
  }
  @Patch(':id')
  @Roles('SYS')
  async updateBlock(
    @Param('id') id: string,
    @Body() updateBlockDto: UpdateBlockDto,
  ) {
    return this.blokService.updateBlock(id, updateBlockDto);
  }
  @Get(':id')
  @Roles('SYS', 'JVE', 'VEN')
  async findOne(@Param('id') id: string) {
    return this.blokService.findBlockById(id);
  }
}
