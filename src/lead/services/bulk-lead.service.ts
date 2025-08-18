import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Lead } from '../entities/lead.entity';
import { LeadSource } from '../entities/lead-source.entity';
import { Ubigeo } from '../entities/ubigeo.entity';
import {
  BulkLeadDto,
  ValidateBulkLeadResponseDto,
} from '../dto/bulk-lead-upload.dto';
import { DocumentType } from '../enums/document-type.enum';

interface ExcelLeadRow {
  firstName: string;
  lastName: string;
  document: string;
  documentType: DocumentType;
  email?: string;
  phone?: string;
  phone2?: string;
  age?: number;
  source?: string;
  observations?: string;
}

interface ExcelValidationError {
  row: number;
  column: string;
  message: string;
}

@Injectable()
export class BulkLeadService {
  private readonly logger = new Logger(BulkLeadService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadSource)
    private readonly leadSourceRepository: Repository<LeadSource>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    private readonly dataSource: DataSource,
  ) {}

  async validateLeadExcel(
    file: Express.Multer.File,
  ): Promise<ValidateBulkLeadResponseDto> {
    try {
      const workbook = XLSX.read(file.buffer, {
        cellDates: true,
        cellStyles: true,
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Para que convierta celdas numéricas en strings
        defval: '', // Valor por defecto para celdas vacías
      });

      const errors: ExcelValidationError[] = [];
      const leadsData: ExcelLeadRow[] = [];

      // Verificar que el archivo tenga datos
      if (!jsonData || jsonData.length === 0) {
        errors.push({
          row: 0,
          column: 'A',
          message: 'El archivo está vacío o no tiene el formato esperado',
        });

        return {
          isValid: false,
          errors,
          totalLeads: 0,
        };
      }

      // Validar cada fila
      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // +2 porque la primera fila es el encabezado y Excel empieza en 1

        // Convertir valores numéricos a string
        if (row.firstName !== undefined && row.firstName !== null) {
          row.firstName = String(row.firstName);
        }
        if (row.lastName !== undefined && row.lastName !== null) {
          row.lastName = String(row.lastName);
        }
        if (row.document !== undefined && row.document !== null) {
          row.document = String(row.document);
        }
        if (row.documentType !== undefined && row.documentType !== null) {
          row.documentType = String(row.documentType);
        }
        if (row.phone !== undefined && row.phone !== null) {
          row.phone = String(row.phone);
        }
        if (row.phone2 !== undefined && row.phone2 !== null) {
          row.phone2 = String(row.phone2);
        }
        if (row.source !== undefined && row.source !== null) {
          row.source = String(row.source);
        }

        // Validar campos requeridos
        if (!row.firstName) {
          errors.push({
            row: rowNumber,
            column: 'firstName',
            message: 'El nombre es requerido',
          });
        }

        if (!row.lastName) {
          errors.push({
            row: rowNumber,
            column: 'lastName',
            message: 'El apellido es requerido',
          });
        }

        if (!row.document) {
          errors.push({
            row: rowNumber,
            column: 'document',
            message: 'El documento es requerido',
          });
        }

        if (
          !row.documentType ||
          ![DocumentType.DNI, DocumentType.CE, DocumentType.RUC].includes(
            row.documentType,
          )
        ) {
          errors.push({
            row: rowNumber,
            column: 'documentType',
            message:
              'El tipo de documento es requerido y debe ser DNI, CE o RUC',
          });
        }

        if (!row.phone && row.phone !== '') {
          errors.push({
            row: rowNumber,
            column: 'phone',
            message: 'El teléfono es requerido',
          });
        }

        // Validar campos opcionales
        if (row.email !== undefined && row.email !== null && row.email !== '') {
          row.email = String(row.email);
          if (!this.validateEmail(row.email)) {
            errors.push({
              row: rowNumber,
              column: 'email',
              message: 'El email no tiene un formato válido',
            });
          }
        }

        if (row.age !== undefined && row.age !== null && row.age !== '') {
          const age = Number(row.age);
          if (isNaN(age) || age < 18 || age > 120) {
            errors.push({
              row: rowNumber,
              column: 'age',
              message: 'La edad debe ser un número entre 18 y 120',
            });
          }
        }

        // Añadir la fila a los leads
        if (
          errors.length === 0 ||
          errors[errors.length - 1].row !== rowNumber
        ) {
          leadsData.push({
            firstName: String(row.firstName),
            lastName: String(row.lastName),
            document: String(row.document),
            documentType: row.documentType,
            email: row.email ? String(row.email) : undefined,
            phone: String(row.phone),
            phone2: row.phone2 ? String(row.phone2) : undefined,
            age: row.age && row.age !== '' ? Number(row.age) : undefined,
            source: row.source ? String(row.source) : undefined,
            observations: row.observations
              ? String(row.observations)
              : undefined,
          });
        }
      });

      // Verificar duplicados en el archivo
      const duplicatesInFile = this.findDuplicatesInFile(leadsData);
      if (duplicatesInFile.length > 0) {
        duplicatesInFile.forEach((dup) => {
          errors.push({
            row: dup.rowIndex + 2, // +2 por el encabezado y que Excel comienza en 1
            column: 'document',
            message: `Documento duplicado ${dup.documentType} ${dup.document} en el archivo (fila ${dup.firstRowIndex + 2})`,
          });
        });
      }

      // Verificar duplicados en la base de datos
      const duplicatesInDB = await this.findDuplicatesInDatabase(leadsData);
      if (duplicatesInDB.length > 0) {
        duplicatesInDB.forEach((dup) => {
          errors.push({
            row: dup.rowIndex + 2, // +2 por el encabezado y que Excel comienza en 1
            column: 'document',
            message: `Documento ${dup.documentType} ${dup.document} ya existe en la base de datos`,
          });
        });
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors: isValid ? undefined : errors,
        totalLeads: leadsData.length,
        data: isValid ? leadsData : undefined,
      };
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
        totalLeads: 0,
      };
    }
  }

  async createBulkLeads(bulkData: BulkLeadDto): Promise<{
    success: boolean;
    message: string;
    totalCreated: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { leads } = bulkData;
      const createdLeads = [];

      // Procesar cada lead
      for (const leadData of leads) {
        // Buscar la fuente si está especificada
        let source = null;
        if (leadData.source) {
          source = await this.leadSourceRepository.findOne({
            where: { name: leadData.source },
          });

          if (!source) {
            throw new BadRequestException(
              `Fuente "${leadData.source}" no encontrada`,
            );
          }
        }

        // Verificar si ya existe
        const existingLead = await this.leadRepository.findOne({
          where: {
            document: leadData.document,
            documentType: leadData.documentType,
          },
        });

        if (existingLead) {
          throw new ConflictException(
            `Documento duplicado: ${leadData.documentType} ${leadData.document}`,
          );
        }

        // Crear el nuevo lead
        const lead = queryRunner.manager.create(Lead, {
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          document: leadData.document,
          documentType: leadData.documentType,
          email: leadData.email,
          phone: leadData.phone,
          phone2: leadData.phone2,
          age:
            leadData.age !== undefined && leadData.age !== null
              ? Number(leadData.age)
              : null,
          source: source,
          isActive: true,
          isInOffice: false,
        });

        const savedLead = await queryRunner.manager.save(lead);
        createdLeads.push(savedLead);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Se han importado ${createdLeads.length} leads exitosamente`,
        totalCreated: createdLeads.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error en la importación masiva de leads: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        'Error al importar los leads: ' + error.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private findDuplicatesInFile(leads: ExcelLeadRow[]): Array<{
    document: string;
    documentType: DocumentType;
    rowIndex: number;
    firstRowIndex: number;
  }> {
    const duplicates = [];
    const documentMap = new Map<string, number>();

    // Construir un mapa de documentos y su primera aparición
    leads.forEach((lead, index) => {
      const key = `${lead.documentType}-${lead.document}`;

      if (documentMap.has(key)) {
        duplicates.push({
          document: lead.document,
          documentType: lead.documentType,
          rowIndex: index,
          firstRowIndex: documentMap.get(key),
        });
      } else {
        documentMap.set(key, index);
      }
    });

    return duplicates;
  }

  private async findDuplicatesInDatabase(leads: ExcelLeadRow[]): Promise<
    Array<{
      document: string;
      documentType: DocumentType;
      rowIndex: number;
    }>
  > {
    const duplicates = [];

    // Verificar cada lead contra la base de datos
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      const existingLead = await this.leadRepository.findOne({
        where: {
          document: lead.document,
          documentType: lead.documentType,
        },
      });

      if (existingLead) {
        duplicates.push({
          document: lead.document,
          documentType: lead.documentType,
          rowIndex: i,
        });
      }
    }

    return duplicates;
  }
}
