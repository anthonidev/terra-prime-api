import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
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
