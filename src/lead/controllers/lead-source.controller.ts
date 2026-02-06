import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LeadSourceService } from '../services/lead-source.service';
import {
  CreateLeadSourceDto,
  UpdateLeadSourceDto,
} from '../dto/lead-source.dto';
import { FindLeadSourcesDto } from '../dto/find-lead-sources.dto';
@Controller('lead-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadSourceController {
  constructor(private readonly leadSourceService: LeadSourceService) {}
  @Post()
  @Roles('SYS', 'ADM', 'REC', 'JVE')
  async create(@Body() createLeadSourceDto: CreateLeadSourceDto) {
    try {
      const leadSource =
        await this.leadSourceService.create(createLeadSourceDto);
      return {
        success: true,
        message: 'Fuente creada exitosamente',
        data: leadSource,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al crear la fuente',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Patch(':id')
  @Roles('SYS', 'ADM', 'REC', 'JVE')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeadSourceDto: UpdateLeadSourceDto,
  ) {
    try {
      const leadSource = await this.leadSourceService.update(
        id,
        updateLeadSourceDto,
      );
      return {
        success: true,
        message: 'Fuente actualizada exitosamente',
        data: leadSource,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar la fuente',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get(':id')
  @Roles('SYS', 'ADM', 'REC', 'VEN', 'JVE')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const leadSource = await this.leadSourceService.findById(id);
      return {
        success: true,
        data: leadSource,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener la fuente',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get()
  @Roles('SYS', 'ADM', 'REC', 'VEN', 'JVE')
  async findAll(@Query() filters: FindLeadSourcesDto) {
    try {
      console.log('SOLICITUD DE LISTADO DE FUENTES', filters);
      const result = await this.leadSourceService.findAll(filters);
      return {
        success: true,
        data: result.items,
        meta: result.meta,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar las fuentes',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('active/list')
  @Roles('SYS', 'ADM', 'REC', 'VEN', 'JVE')
  async findAllActive() {
    try {
      const leadSources = await this.leadSourceService.findAllActive();
      return {
        success: true,
        data: leadSources,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar las fuentes activas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
