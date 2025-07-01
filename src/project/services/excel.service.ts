import { Injectable, Logger } from '@nestjs/common';

import * as XLSX from 'xlsx';
import {
  CurrencyType,
  DuplicateSummary,
  ExcelValidationError,
  LotExcelDto,
  LotStatus,
  ProjectExcelDto,
  ValidateExcelResponseDto,
  ValidationSummary,
} from '../dto/bulk-project-upload.dto';

type ExcelRow = (string | number | boolean | Date | null)[];
type ExcelData = ExcelRow[];

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  async validateProjectExcel(
    file: Express.Multer.File,
  ): Promise<ValidateExcelResponseDto> {
    try {
      const workbook = XLSX.read(file.buffer, {
        cellDates: true,
        cellStyles: true,
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
      });

      const data = jsonData as ExcelData;
      const errors: ExcelValidationError[] = [];

      // Validación básica del archivo
      if (!data || data.length < 3) {
        errors.push({
          row: 0,
          column: 'A',
          message: 'El archivo no tiene el formato esperado',
        });
        return { isValid: false, errors };
      }

      // Validar información del proyecto
      const projectName = this.getCellValue(data, 0, 1);
      const currency = this.getCellValue(data, 1, 1);

      if (!projectName) {
        errors.push({
          row: 1,
          column: 'B',
          message: 'El nombre del proyecto es requerido',
        });
      }

      if (!currency || (currency !== 'USD' && currency !== 'PEN')) {
        errors.push({
          row: 2,
          column: 'B',
          message: 'La moneda debe ser USD o PEN',
        });
      }

      // Validar encabezados
      const headers = data[2];
      if (!this.validateLotHeaders(headers)) {
        errors.push({
          row: 3,
          column: 'A-G',
          message: 'Los encabezados para los lotes no son correctos',
        });
      }

      const projectData: ProjectExcelDto = {
        name: projectName,
        currency: currency as CurrencyType,
        lots: [],
      };

      // Validar cada fila de lotes
      for (let i = 3; i < data.length; i++) {
        const row = data[i];
        if (!row || row.filter((cell) => cell !== null).length === 0) {
          continue;
        }

        const lotValidation = this.validateLotRow(row, i + 1);
        if (lotValidation.errors.length > 0) {
          errors.push(...lotValidation.errors);
        } else if (lotValidation.lot) {
          projectData.lots.push(lotValidation.lot);
        }
      }

      // 🔥 NUEVA VALIDACIÓN DE DUPLICADOS
      let duplicateInfo: any = { duplicates: [], duplicateErrors: [] };
      if (projectData.lots.length > 0) {
        duplicateInfo = this.validateAndAnalyzeDuplicates(projectData.lots);
        errors.push(...duplicateInfo.duplicateErrors);
      }

      const isValid = errors.length === 0;

      // Categorizar errores
      const formatErrors = errors.filter(
        (e) =>
          e.message.includes('formato') ||
          e.message.includes('encabezados') ||
          e.message.includes('requerido') ||
          e.message.includes('número'),
      ).length;

      const duplicateErrors = errors.filter((e) =>
        e.message.includes('DUPLICADO'),
      ).length;

      const validationErrors = errors.length - formatErrors - duplicateErrors;

      // Crear resumen
      const summary: ValidationSummary = {
        totalLots: projectData.lots.length,
        duplicateGroups: duplicateInfo.duplicates.length,
        totalDuplicates: duplicateInfo.duplicates.reduce(
          (sum: number, dup: any) => sum + dup.count - 1,
          0,
        ),
        duplicateDetails: duplicateInfo.duplicates,
        formatErrors,
        validationErrors,
      };

      // Generar mensaje descriptivo
      let message = '';
      if (isValid) {
        message = `✅ Excel validado exitosamente. ${summary.totalLots} lotes procesados sin errores.`;
      } else {
        const messageParts = [];
        if (summary.duplicateGroups > 0) {
          messageParts.push(
            `${summary.totalDuplicates} lotes duplicados en ${summary.duplicateGroups} grupos`,
          );
        }
        if (summary.formatErrors > 0) {
          messageParts.push(`${summary.formatErrors} errores de formato`);
        }
        if (summary.validationErrors > 0) {
          messageParts.push(
            `${summary.validationErrors} errores de validación`,
          );
        }
        message = `❌ Se encontraron errores: ${messageParts.join(', ')}.`;
      }

      const response: ValidateExcelResponseDto = {
        isValid,
        errors: errors.length > 0 ? errors : undefined,
        data: isValid ? projectData : undefined,
        summary,
        message,
      };

      // Log del resultado
      if (isValid) {
        this.logger.log(
          `✅ Excel validado exitosamente. Proyecto: ${projectName}, Lotes: ${projectData.lots.length}`,
        );
      } else {
        this.logger.warn(
          `❌ Excel con errores. Total errores: ${errors.length}`,
        );
        this.logger.warn(
          `   Duplicados: ${summary.totalDuplicates}, Formato: ${summary.formatErrors}, Validación: ${summary.validationErrors}`,
        );
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Error validando archivo Excel: ${error.message}`,
        error.stack,
      );
      return {
        isValid: false,
        errors: [
          {
            row: 0,
            column: 'A',
            message: 'Error al procesar el archivo: ' + error.message,
          },
        ],
      };
    }
  }

  /**
   * 🔥 NUEVA FUNCIÓN: Valida y analiza duplicados en los lotes
   */
  private validateAndAnalyzeDuplicates(lots: LotExcelDto[]): {
    duplicates: DuplicateSummary[];
    duplicateErrors: ExcelValidationError[];
  } {
    const errors: ExcelValidationError[] = [];
    const seenLots = new Map<
      string,
      Array<{ index: number; data: LotExcelDto }>
    >();

    // Agrupar lotes por combinación única (stage + block + lot)
    lots.forEach((lot, index) => {
      // Limpiar espacios en blanco
      const cleanStage = lot.stage.trim();
      const cleanBlock = lot.block.trim();
      const cleanLot = lot.lot.toString().trim();

      const uniqueKey = `${cleanStage}|${cleanBlock}|${cleanLot}`;

      if (!seenLots.has(uniqueKey)) {
        seenLots.set(uniqueKey, []);
      }

      seenLots.get(uniqueKey).push({
        index,
        data: { ...lot, stage: cleanStage, block: cleanBlock, lot: cleanLot },
      });
    });

    // Identificar duplicados
    const duplicates: DuplicateSummary[] = [];
    seenLots.forEach((occurrences, key) => {
      if (occurrences.length > 1) {
        const [stage, block, lot] = key.split('|');

        duplicates.push({
          stage,
          block,
          lot,
          count: occurrences.length,
          rows: occurrences.map((occ) => occ.index + 4), // +4 porque hay 3 filas de encabezado y Excel empieza en 1
          prices: occurrences.map((occ) => occ.data.lotPrice),
        });
      }
    });

    // Generar errores para duplicados
    duplicates.forEach((duplicate) => {
      const rows = duplicate.rows.join(', ');
      const prices = duplicate.prices
        .map((price) => `${price.toLocaleString()}`)
        .join(', ');

      // Error principal en la primera ocurrencia
      errors.push({
        row: duplicate.rows[0],
        column: 'A-C',
        message: `DUPLICADO: Lote "${duplicate.lot}" en bloque "${duplicate.block}", etapa "${duplicate.stage}" se repite en las filas: ${rows}. Precios: ${prices}`,
      });

      // Errores adicionales en las otras ocurrencias
      for (let i = 1; i < duplicate.rows.length; i++) {
        const row = duplicate.rows[i];
        errors.push({
          row: row,
          column: 'A-C',
          message: `DUPLICADO: Este lote ya existe en la fila ${duplicate.rows[0]}. Elimine esta entrada duplicada.`,
        });
      }
    });

    // Log de resumen de duplicados
    if (duplicates.length > 0) {
      this.logger.warn(
        `🚨 Se encontraron ${duplicates.length} grupos de lotes duplicados:`,
      );
      duplicates.forEach((dup) => {
        this.logger.warn(
          `  - Etapa "${dup.stage}", Bloque "${dup.block}", Lote "${dup.lot}": ${dup.count} ocurrencias en filas [${dup.rows.join(', ')}]`,
        );
      });
    } else {
      this.logger.log(
        `✅ No se encontraron duplicados en ${lots.length} lotes`,
      );
    }

    return { duplicates, duplicateErrors: errors };
  }

  /**
   * Valida espacios en blanco problemáticos
   */
  private validateWhitespaceIssues(
    lots: LotExcelDto[],
  ): ExcelValidationError[] {
    const errors: ExcelValidationError[] = [];

    lots.forEach((lot, index) => {
      const rowNumber = index + 4; // +4 por encabezados

      // Verificar espacios al inicio o final
      if (lot.stage !== lot.stage.trim()) {
        errors.push({
          row: rowNumber,
          column: 'A',
          message: `La etapa "${lot.stage}" tiene espacios al inicio o final`,
        });
      }

      if (lot.block !== lot.block.trim()) {
        errors.push({
          row: rowNumber,
          column: 'B',
          message: `El bloque "${lot.block}" tiene espacios al inicio o final`,
        });
      }

      if (lot.lot.toString() !== lot.lot.toString().trim()) {
        errors.push({
          row: rowNumber,
          column: 'C',
          message: `El lote "${lot.lot}" tiene espacios al inicio o final`,
        });
      }
    });

    return errors;
  }

  private getCellValue(data: ExcelData, row: number, col: number): any {
    return data[row]?.[col] || null;
  }

  private validateLotHeaders(headers: ExcelRow): boolean {
    const expectedHeaders = [
      'Etapa',
      'Manzana',
      'Lote',
      'Area',
      'Precio Lote',
      'Precio HU',
      'Estado',
    ];

    return expectedHeaders.every(
      (header, index) =>
        headers[index] &&
        headers[index].toString().trim().toLowerCase() === header.toLowerCase(),
    );
  }

  private validateLotRow(
    row: ExcelRow,
    rowNumber: number,
  ): {
    errors: ExcelValidationError[];
    lot?: LotExcelDto;
  } {
    const errors: ExcelValidationError[] = [];

    // Validación de etapa
    if (!row[0]) {
      errors.push({
        row: rowNumber,
        column: 'A',
        message: 'La etapa es requerida',
      });
    }

    // Validación de manzana/bloque
    if (!row[1]) {
      errors.push({
        row: rowNumber,
        column: 'B',
        message: 'La manzana es requerida',
      });
    }

    // Validación de lote
    if (row[2] === null || row[2] === undefined || row[2] === '') {
      errors.push({
        row: rowNumber,
        column: 'C',
        message: 'El lote es requerido',
      });
    }

    // Validación de área
    if (!row[3] || isNaN(Number(row[3])) || Number(row[3]) <= 0) {
      errors.push({
        row: rowNumber,
        column: 'D',
        message: 'El área debe ser un número mayor a 0',
      });
    }

    // Validación de precio del lote
    if (!row[4] || isNaN(Number(row[4])) || Number(row[4]) <= 0) {
      errors.push({
        row: rowNumber,
        column: 'E',
        message: 'El precio del lote debe ser un número mayor a 0',
      });
    }

    // Validación de precio de habilitación urbana
    if (
      row[5] === undefined ||
      row[5] === null ||
      isNaN(Number(row[5])) ||
      Number(row[5]) < 0
    ) {
      errors.push({
        row: rowNumber,
        column: 'F',
        message:
          'El precio de habilitación urbana debe ser un número mayor o igual a 0',
      });
    }

    // Validación de estado
    const validStatus = [
      'Activo',
      'Inactivo',
      'Vendido',
      'Separado',
      'ACTIVE',
      'INACTIVE',
      'SOLD',
      'RESERVED',
    ];

    if (!row[6] || !validStatus.includes(String(row[6]))) {
      errors.push({
        row: rowNumber,
        column: 'G',
        message: 'El estado debe ser Activo, Inactivo, Vendido o Separado',
      });
    }

    if (errors.length > 0) {
      return { errors };
    }

    // Normalizar estado
    let status = String(row[6]);
    if (status === 'ACTIVE') status = 'Activo';
    if (status === 'INACTIVE') status = 'Inactivo';
    if (status === 'SOLD') status = 'Vendido';
    if (status === 'RESERVED') status = 'Separado';

    return {
      errors: [],
      lot: {
        stage: row[0].toString().trim(),
        block: row[1].toString().trim(),
        lot: row[2].toString().trim(),
        area: Number(row[3]),
        lotPrice: Number(row[4]),
        urbanizationPrice: Number(row[5]),
        status: status as LotStatus,
      },
    };
  }
}
