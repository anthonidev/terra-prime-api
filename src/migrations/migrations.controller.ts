import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MigrationsService } from './migrations.service';
import { BulkImportSalesDto } from './dto/bulk-import-sales.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ImportResult } from './interfaces/import-result.interface';

@Controller('migrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MigrationsController {
  private readonly logger = new Logger(MigrationsController.name);

  constructor(private readonly migrationsService: MigrationsService) {}

  /**
   * Endpoint para validar Excel y generar JSON
   * POST /migrations/validate-excel
   *
   * Solo accesible por roles: SYS, JVE
   */
  @Post('validate-excel')
  @Roles('SYS', 'JVE')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{
    message: string;
    data: BulkImportSalesDto;
    summary: {
      totalRows: number;
      totalSales: number;
      warnings: string[];
    };
  }> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('El archivo debe ser formato Excel (.xlsx o .xls)');
    }

    this.logger.log(`📄 Archivo Excel recibido: ${file.originalname}`);

    try {
      const result = await this.migrationsService.validateAndTransformExcel(file.buffer);

      this.logger.log(
        `✅ Excel validado: ${result.data.sales.length} ventas generadas`,
      );

      return {
        message: 'Excel validado exitosamente',
        data: result.data,
        summary: result.summary,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error al validar Excel: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Endpoint de importación masiva de ventas
   * POST /migrations/bulk-import-sales
   *
   * Solo accesible por roles: SYS, JVE
   */
  @Post('bulk-import-sales')
  @Roles('SYS', 'JVE')
  @HttpCode(HttpStatus.OK)
  async bulkImportSales(
    @Body() dto: BulkImportSalesDto,
  ): Promise<{
    message: string;
    result: ImportResult;
  }> {
    this.logger.log(
      `📥 Solicitud de importación masiva recibida: ${dto.sales.length} ventas`,
    );

    try {
      const result = await this.migrationsService.bulkImportSales(dto);

      this.logger.log(
        `✨ Importación completada: ${result.success}/${result.total} ventas creadas`,
      );

      return {
        message: 'Importación completada',
        result,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error en importación masiva: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
