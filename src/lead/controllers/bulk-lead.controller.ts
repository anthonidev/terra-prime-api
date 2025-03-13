import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BulkLeadService } from '../services/bulk-lead.service';
import {
  BulkLeadDto,
  ValidateBulkLeadResponseDto,
} from '../dto/bulk-lead-upload.dto';

@Controller('leads/bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkLeadController {
  constructor(private readonly bulkLeadService: BulkLeadService) {}

  @Post('validate-excel')
  @Roles('SYS', 'ADM', 'REC')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidateBulkLeadResponseDto> {
    try {
      if (!file) {
        throw new HttpException(
          'Archivo no proporcionado',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.bulkLeadService.validateLeadExcel(file);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error al validar el archivo',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('import')
  @Roles('SYS', 'ADM', 'REC')
  async createBulkLeads(@Body() bulkLeadData: BulkLeadDto) {
    try {
      const result = await this.bulkLeadService.createBulkLeads(bulkLeadData);

      return {
        success: true,
        message: result.message,
        totalCreated: result.totalCreated,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error al importar leads',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
