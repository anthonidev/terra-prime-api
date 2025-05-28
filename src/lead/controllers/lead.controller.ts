import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateUpdateLeadDto } from '../dto/create-update-lead.dto';
import { FindLeadByDocumentDto } from '../dto/find-by-document.dto';
import { LeadService } from '../services/lead.service';
import { FindLeadsDto } from '../dto/find-leads.dto';
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) { }
  @Post('find-by-document')
  @Roles('SYS', 'REC', 'VEN')
  async findByDocument(@Body() findDto: FindLeadByDocumentDto) {
    try {
      const { lead, isInOffice } =
        await this.leadService.findByDocument(findDto);
      if (isInOffice) {
        return {
          success: false,
          message: `Este lead ya se encuentra en la oficina`,
          data: lead,
        };
      }
      return {
        success: true,
        message: 'Lead encontrado',
        data: lead,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('No se encontró un lead')) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
      console.error('Error al buscar el lead por documento:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error al buscar el lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Post('register')
  @Roles('SYS', 'REC')
  async createOrUpdateLead(@Body() createUpdateDto: CreateUpdateLeadDto) {
    try {
      const lead = await this.leadService.createOrUpdateLead(createUpdateDto);
      const isNewLead = lead.visits.length === 1;
      return {
        success: true,
        message: isNewLead
          ? 'Se ha registrado un nuevo lead y su visita'
          : 'Se ha actualizado el lead y registrado una nueva visita',
        data: lead,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
      console.error('Error al registrar o actualizar el lead:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error al registrar el lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('update/:id')
  @Roles('SYS', 'REC')
  async updateLead(
    @Param('id') id: string,
    @Body() updateDto: CreateUpdateLeadDto,
  ) {
    try {
      const lead = await this.leadService.updateLead(id, updateDto);
      return {
        success: true,
        message: 'Se ha actualizado el lead',
        data: lead,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ConflictException) {
        return {
          success: false,
          message: error.message,
          data: null,
        };
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar el lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Roles('SYS', 'REC', 'VEN', 'GVE')
  async findAll(@Query() filters: FindLeadsDto) {
    try {
      const result = await this.leadService.findAll(filters);
      return {
        success: true,
        data: result.items,
        meta: result.meta,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar los leads',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get(':id')
  @Roles('SYS', 'REC', 'VEN', 'GVE')
  async findOne(@Param('id') id: string) {
    try {
      const lead = await this.leadService.findOneWithDetails(id);
      return {
        success: true,
        data: lead,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Error al obtener el lead',
          error: error.message,
        },
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('register-departure/:id')
  @Roles('SYS', 'REC')
  async registerDeparture(@Param('id') id: string) {
    try {
      const lead = await this.leadService.registerDeparture(id);
      return {
        success: true,
        message: 'Se ha registrado la salida del lead',
        data: lead,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al registrar la salida del lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
