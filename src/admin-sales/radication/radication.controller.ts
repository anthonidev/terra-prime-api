import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RadicationService } from './radication.service';

@Controller('radication')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RadicationController {
  constructor(private readonly radicationService: RadicationService) {}

  @Post('generate/:saleId')
  @Roles('SYS', 'ADM', 'JVE', 'VEN')
  async generateRadicationPdf(@Param('saleId', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.radicationService.generateRadicationPdf(saleId);
      return {
        success: true,
        message: 'PDF de radicación generado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al generar el PDF de radicación',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('document/:saleId')
  @Roles('SYS', 'ADM', 'JVE', 'VEN')
  async getRadicationDocument(@Param('saleId', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.radicationService.getRadicationDocument(saleId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al obtener el documento de radicación',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('regenerate/:saleId')
  @Roles('SYS', 'ADM', 'JVE')
  async regenerateRadicationPdf(@Param('saleId', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.radicationService.regenerateRadicationPdf(saleId);
      return {
        success: true,
        message: 'PDF de radicación regenerado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al regenerar el PDF de radicación',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}