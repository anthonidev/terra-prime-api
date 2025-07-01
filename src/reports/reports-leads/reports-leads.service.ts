import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PdfService } from 'src/common/services/pdf.service';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Lead } from 'src/lead/entities/lead.entity';
import { Ubigeo } from 'src/lead/entities/ubigeo.entity';
import { Repository } from 'typeorm';
import { LeadReportDocumentResponse, LeadReportGenerationResponse, LeadReportPdfData } from './interfaces/leads-response.interface';
import { ReportsLeadsPdfService } from './reports-leads.pdf.service';

@Injectable()
export class ReportsLeadsService {
  private readonly logger = new Logger(ReportsLeadsService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    private readonly reportsLeadsPdfService: ReportsLeadsPdfService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async generateLeadReportPdf(leadId: string): Promise<LeadReportGenerationResponse> {
    try {
      // Verificar si ya existe un PDF (asumir que agregaste este campo a Lead entity)
      const existingLead = await this.getLeadWithRelations(leadId);
      
      if (existingLead.reportPdfUrl) { // Campo a agregar en Lead entity
        // Verificar si el archivo aún existe en S3
        const fileExists = await this.awsS3Service.fileExistsByUrl(existingLead.reportPdfUrl);
        
        if (fileExists) {
          return {
            leadId: existingLead.id,
            documentUrl: existingLead.reportPdfUrl,
            generatedAt: existingLead.updatedAt,
            clientName: `${existingLead.firstName} ${existingLead.lastName}`,
            documentNumber: existingLead.document,
            leadInfo: {
              documentType: existingLead.documentType,
              phone: existingLead.phone,
              source: existingLead.source?.name || 'Sin fuente',
            },
            isNewDocument: false,
          };
        } else {
          // El archivo no existe en S3, generar uno nuevo
          this.logger.warn(`PDF file not found in S3 for lead ${leadId}, generating new one`);
        }
      }

      // Generar nuevo PDF
      return await this.createNewLeadReportPdf(existingLead);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating lead report PDF for lead ${leadId}:`, error);
      throw new InternalServerErrorException('Error al generar el PDF del reporte de lead');
    }
  }

  async getLeadReportDocument(leadId: string): Promise<LeadReportDocumentResponse> {
    try {
      const lead = await this.getLeadWithRelations(leadId);
      
      if (!lead.reportPdfUrl) {
        throw new NotFoundException('No se ha generado un reporte para este lead');
      }

      // Verificar que el archivo existe en S3
      const fileExists = await this.awsS3Service.fileExistsByUrl(lead.reportPdfUrl);
      if (!fileExists) {
        throw new NotFoundException('El documento del reporte de lead no se encuentra disponible');
      }

      return {
        leadId: lead.id,
        documentUrl: lead.reportPdfUrl,
        generatedAt: lead.updatedAt,
        clientName: `${lead.firstName} ${lead.lastName}`,
        documentNumber: lead.document,
        leadInfo: {
          documentType: lead.documentType,
          phone: lead.phone,
          source: lead.source?.name || 'Sin fuente',
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting lead report document for lead ${leadId}:`, error);
      throw new InternalServerErrorException('Error al obtener el documento del reporte de lead');
    }
  }

  async regenerateLeadReportPdf(leadId: string): Promise<LeadReportGenerationResponse> {
    try {
      const lead = await this.getLeadWithRelations(leadId);
      
      // Eliminar el archivo anterior si existe
      if (lead.reportPdfUrl) {
        try {
          await this.awsS3Service.deleteFileByUrl(lead.reportPdfUrl);
          this.logger.log(`Previous lead report PDF deleted for lead ${leadId}`);
        } catch (error) {
          this.logger.warn(`Failed to delete previous PDF for lead ${leadId}:`, error);
        }
      }

      // Generar nuevo PDF
      return await this.createNewLeadReportPdf(lead);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error regenerating lead report PDF for lead ${leadId}:`, error);
      throw new InternalServerErrorException('Error al regenerar el PDF del reporte de lead');
    }
  }

  private async getLeadWithRelations(leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id: leadId },
      relations: [
        'source',           // LeadSource
        'ubigeo',          // Ubicación geográfica
        'visits',          // LeadVisit
        'visits.liner',    // Liner de cada visita
        'vendor',          // Usuario vendedor
        'client',          // Cliente si ya se convirtió
      ],
    });

    if (!lead) {
      throw new NotFoundException(`Lead con ID ${leadId} no encontrado`);
    }

    return lead;
  }

  private async createNewLeadReportPdf(lead: Lead): Promise<LeadReportGenerationResponse> {
    try {
      // Obtener información geográfica completa
      let additionalInfo = null;
      
      if (lead.ubigeo) {
        // Obtener provincia y departamento
        const province = await this.ubigeoRepository.findOne({
          where: { id: lead.ubigeo.parentId },
        });
        
        let department = null;
        if (province) {
          department = await this.ubigeoRepository.findOne({
            where: { id: province.parentId },
          });
        }

        additionalInfo = {
          districtName: lead.ubigeo.name,
          provinceName: province?.name,
          departmentName: department?.name,
        };
      }

      // Generar PDF
      const pdfData: LeadReportPdfData = {
        lead,
        additionalInfo,
      };

      const pdfUrl = await this.reportsLeadsPdfService.generateLeadReportPdf(pdfData);

      // Actualizar el lead con la URL del PDF
      // NOTA: Necesitas agregar el campo reportPdfUrl a la entidad Lead
      await this.leadRepository.update(lead.id, {
        reportPdfUrl: pdfUrl,
      });

      this.logger.log(`Lead report PDF generated successfully for lead ${lead.id}`);

      return {
        leadId: lead.id,
        documentUrl: pdfUrl,
        generatedAt: new Date(),
        clientName: `${lead.firstName} ${lead.lastName}`,
        documentNumber: lead.document,
        leadInfo: {
          documentType: lead.documentType,
          phone: lead.phone,
          source: lead.source?.name || 'Sin fuente',
        },
        isNewDocument: true,
      };
    } catch (error) {
      this.logger.error(`Error creating new lead report PDF for lead ${lead.id}:`, error);
      throw new InternalServerErrorException('Error al crear el PDF del reporte de lead');
    }
  }
}
