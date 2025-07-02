import { Controller, Get, HttpException, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ReportsPaymentAcordService } from './reports-payment-acord.service';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('reports-payment-acord')
export class ReportsPaymentAcordController {
  constructor(private readonly reportsPaymentAcordService: ReportsPaymentAcordService) {}

  @Post('generate/:id')
  @Roles('JVE')
  async generatePaymentAcordReportPdf(@Param('id', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.reportsPaymentAcordService.generatePaymentAcordReportPdf(saleId);
      return {
        success: true,
        message: 'PDF del acuerdo de pago generado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al generar el PDF del acuerdo de pago',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('document/:id')
  @Roles('JVE')
  async getPaymentAcordReportDocument(@Param('id', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.reportsPaymentAcordService.getPaymentAcordReportDocument(saleId);
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
          message: 'Error al obtener el documento del acuerdo de pago',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('regenerate/:saleId')
  @Roles('JVE')
  async regeneratePaymentAcordReportPdf(@Param('saleId', ParseUUIDPipe) saleId: string) {
    try {
      const result = await this.reportsPaymentAcordService.regeneratePaymentAcordReportPdf(saleId);
      return {
        success: true,
        message: 'PDF del acuerdo de pago regenerado exitosamente',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Error al regenerar el PDF del acuerdo de pago',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}