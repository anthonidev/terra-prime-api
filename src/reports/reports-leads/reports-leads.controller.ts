import { Controller, Get, HttpException, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ReportsLeadsService } from './reports-leads.service';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('reports-leads')
export class ReportsLeadsController {
  constructor(private readonly reportsLeadsService: ReportsLeadsService) {}
  @Post('generate/:id')
  @Roles('SYS', 'ADM', 'JVE', 'VEN')
  async generateLeadReportPdf(@Param('id', ParseUUIDPipe) leadId: string) {
    try {
      const result = await this.reportsLeadsService.generateLeadReportPdf(leadId);
      return {
        success: true,
        message: 'PDF del reporte de lead generado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al generar el PDF del reporte de lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('document/:id')
  @Roles('SYS', 'ADM', 'JVE', 'VEN')
  async getLeadReportDocument(@Param('id', ParseUUIDPipe) leadId: string) {
    try {
      const result = await this.reportsLeadsService.getLeadReportDocument(leadId);
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
          message: 'Error al obtener el documento del reporte de lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('regenerate/:leadId')
  @Roles('SYS', 'ADM', 'JVE')
  async regenerateLeadReportPdf(@Param('leadId', ParseUUIDPipe) leadId: string) {
    try {
      const result = await this.reportsLeadsService.regenerateLeadReportPdf(leadId);
      return {
        success: true,
        message: 'PDF del reporte de lead regenerado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al regenerar el PDF del reporte de lead',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
