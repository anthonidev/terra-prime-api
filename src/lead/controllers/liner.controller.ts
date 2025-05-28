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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LinerService } from '../services/liner.service';
import { CreateLinerDto, UpdateLinerDto } from '../dto/liner.dto';
import { FindLinersDto } from '../dto/find-liners.dto';
@Controller('liners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LinerController {
  constructor(private readonly linerService: LinerService) { }
  @Post()
  @Roles('SYS', 'ADM', 'REC')
  async create(@Body() createLinerDto: CreateLinerDto) {
    try {
      const liner = await this.linerService.create(createLinerDto);
      return {
        success: true,
        message: 'Liner creado exitosamente',
        data: liner,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al crear el liner',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Patch(':id')
  @Roles('SYS', 'ADM', 'REC')
  async update(
    @Param('id') id: string,
    @Body() updateLinerDto: UpdateLinerDto,
  ) {
    try {
      const liner = await this.linerService.update(id, updateLinerDto);
      return {
        success: true,
        message: 'Liner actualizado exitosamente',
        data: liner,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al actualizar el liner',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Get(':id')
  @Roles('SYS', 'ADM', 'REC', 'VEN')
  async findOne(@Param('id') id: string) {
    try {
      const liner = await this.linerService.findById(id);
      return {
        success: true,
        data: liner,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener el liner',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Get()
  @Roles('SYS', 'ADM', 'REC', 'VEN')
  async findAll(@Query() filters: FindLinersDto) {
    try {
      const result = await this.linerService.findAll(filters);
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
          message: 'Error al listar los liners',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Get('active/list')
  @Roles('SYS', 'ADM', 'REC', 'VEN')
  async findAllActive() {
    try {
      const liners = await this.linerService.findAllActive();
      return {
        success: true,
        data: liners,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al listar los liners activos',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
