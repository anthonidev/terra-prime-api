import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { CurrencyType, ExcelValidationError, LotStatus, ProjectExcelDto, ValidateExcelResponseDto } from '../dto/bulk-project-upload.dto';

// Tipos para ayudar con la conversión de datos del Excel
type ExcelRow = (string | number | boolean | Date | null)[];
type ExcelData = ExcelRow[];

@Injectable()
export class ExcelService {
    private readonly logger = new Logger(ExcelService.name);

    /**
     * Valida un archivo Excel de proyectos
     */
    async validateProjectExcel(file: Express.Multer.File): Promise<ValidateExcelResponseDto> {
        try {
            // Leer el archivo Excel
            const workbook = XLSX.read(file.buffer, {
                cellDates: true,
                cellStyles: true,
            });

            // Tomar la primera hoja
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Convertir a JSON para procesar
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            const data = jsonData as ExcelData;

            // Array para almacenar errores
            const errors: ExcelValidationError[] = [];

            // Validar estructura básica del archivo
            if (!data || data.length < 3) {
                errors.push({
                    row: 0,
                    column: 'A',
                    message: 'El archivo no tiene el formato esperado'
                });
                return { isValid: false, errors };
            }

            // Extraer información del proyecto
            const projectName = this.getCellValue(data, 0, 1);
            const currency = this.getCellValue(data, 1, 1);

            // Validar nombre del proyecto
            if (!projectName) {
                errors.push({
                    row: 1,
                    column: 'B',
                    message: 'El nombre del proyecto es requerido'
                });
            }

            // Validar moneda
            if (!currency || (currency !== 'USD' && currency !== 'PEN')) {
                errors.push({
                    row: 2,
                    column: 'B',
                    message: 'La moneda debe ser USD o PEN'
                });
            }

            // Validar que existen encabezados de lotes
            const headers = data[2];
            if (!this.validateLotHeaders(headers)) {
                errors.push({
                    row: 3,
                    column: 'A-G',
                    message: 'Los encabezados para los lotes no son correctos'
                });
            }

            // Crear objeto para almacenar datos validados
            const projectData: ProjectExcelDto = {
                name: projectName,
                currency: currency as CurrencyType,
                lots: []
            };

            // Validar lotes (desde la fila 4, índice 3)
            for (let i = 3; i < data.length; i++) {
                const row = data[i];
                if (!row || row.filter(cell => cell !== null).length === 0) {
                    continue; // Fila vacía
                }

                const lotValidation = this.validateLotRow(row, i + 1);
                if (lotValidation.errors.length > 0) {
                    errors.push(...lotValidation.errors);
                } else if (lotValidation.lot) {
                    projectData.lots.push(lotValidation.lot);
                }
            }

            // Determinar si la validación pasó
            const isValid = errors.length === 0;

            return {
                isValid,
                errors: isValid ? undefined : errors,
                data: isValid ? projectData : undefined
            };
        } catch (error) {
            this.logger.error(`Error validando archivo Excel: ${error.message}`, error.stack);
            return {
                isValid: false,
                errors: [{
                    row: 0,
                    column: 'A',
                    message: 'Error al procesar el archivo: ' + error.message
                }]
            };
        }
    }

    /**
     * Obtiene el valor de una celda específica
     */
    private getCellValue(data: ExcelData, row: number, col: number): any {
        return data[row]?.[col] || null;
    }

    /**
     * Valida los encabezados del archivo Excel
     */
    private validateLotHeaders(headers: ExcelRow): boolean {
        const expectedHeaders = ['Etapa', 'Manzana', 'Lote', 'Area', 'Precio Lote', 'Precio HU', 'Estado'];
        return expectedHeaders.every((header, index) =>
            headers[index] && headers[index].toString().trim().toLowerCase() === header.toLowerCase());
    }

    /**
     * Valida una fila de lote del Excel
     */
    private validateLotRow(row: ExcelRow, rowNumber: number): {
        errors: ExcelValidationError[],
        lot?: any
    } {
        const errors: ExcelValidationError[] = [];
        const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

        // Validar etapa
        if (!row[0]) {
            errors.push({
                row: rowNumber,
                column: 'A',
                message: 'La etapa es requerida'
            });
        }

        // Validar manzana
        if (!row[1]) {
            errors.push({
                row: rowNumber,
                column: 'B',
                message: 'La manzana es requerida'
            });
        }

        // Validar lote
        if (row[2] === null || row[2] === undefined) {
            errors.push({
                row: rowNumber,
                column: 'C',
                message: 'El lote es requerido'
            });
        }

        // Validar área
        if (!row[3] || isNaN(Number(row[3])) || Number(row[3]) <= 0) {
            errors.push({
                row: rowNumber,
                column: 'D',
                message: 'El área debe ser un número mayor a 0'
            });
        }

        // Validar precio lote
        if (!row[4] || isNaN(Number(row[4])) || Number(row[4]) <= 0) {
            errors.push({
                row: rowNumber,
                column: 'E',
                message: 'El precio del lote debe ser un número mayor a 0'
            });
        }

        // Validar precio HU
        if (row[5] === undefined || row[5] === null || isNaN(Number(row[5])) || Number(row[5]) < 0) {
            errors.push({
                row: rowNumber,
                column: 'F',
                message: 'El precio de habilitación urbana debe ser un número mayor o igual a 0'
            });
        }

        // Validar estado
        const validStatus = ['Activo', 'Inactivo', 'Vendido', 'Separado', 'ACTIVE', 'INACTIVE', 'SOLD', 'RESERVED'];
        if (!row[6] || !validStatus.includes(String(row[6]))) {
            errors.push({
                row: rowNumber,
                column: 'G',
                message: 'El estado debe ser Activo, Inactivo, Vendido o Separado'
            });
        }

        // Si hay errores, no devolver lote
        if (errors.length > 0) {
            return { errors };
        }

        // Normalizar estado
        let status = String(row[6]);
        if (status === 'ACTIVE') status = 'Activo';
        if (status === 'INACTIVE') status = 'Inactivo';
        if (status === 'SOLD') status = 'Vendido';
        if (status === 'RESERVED') status = 'Separado';

        // Crear objeto de lote validado
        return {
            errors: [],
            lot: {
                stage: row[0].toString(),
                block: row[1].toString(),
                lot: row[2].toString(),
                area: Number(row[3]),
                lotPrice: Number(row[4]),
                urbanizationPrice: Number(row[5]),
                status: status as LotStatus
            }
        };
    }
}