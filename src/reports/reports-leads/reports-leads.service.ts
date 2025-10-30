import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PdfService } from 'src/common/services/pdf.service';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Lead } from 'src/lead/entities/lead.entity';
import { LeadVisit } from 'src/lead/entities/lead-visit.entity';
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
    @InjectRepository(LeadVisit)
    private readonly leadVisitRepository: Repository<LeadVisit>,
    @InjectRepository(Ubigeo)
    private readonly ubigeoRepository: Repository<Ubigeo>,
    private readonly reportsLeadsPdfService: ReportsLeadsPdfService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async generateLeadVisitReportPdf(leadVisitId: string): Promise<LeadReportGenerationResponse> {
    try {
      // Verificar si ya existe un PDF
      const existingLeadVisit = await this.getLeadVisitWithRelations(leadVisitId);

      if (existingLeadVisit.reportPdfUrl) {
        // Verificar si el archivo aún existe en S3
        const fileExists = await this.awsS3Service.fileExistsByUrl(existingLeadVisit.reportPdfUrl);

        if (fileExists) {
          return {
            leadId: existingLeadVisit.lead.id,
            documentUrl: existingLeadVisit.reportPdfUrl,
            generatedAt: existingLeadVisit.updatedAt,
            clientName: `${existingLeadVisit.lead.firstName} ${existingLeadVisit.lead.lastName}`,
            documentNumber: existingLeadVisit.lead.document,
            leadInfo: {
              documentType: existingLeadVisit.lead.documentType,
              phone: existingLeadVisit.lead.phone,
              source: existingLeadVisit.lead.source?.name || 'Sin fuente',
            },
            isNewDocument: false,
          };
        } else {
          // El archivo no existe en S3, generar uno nuevo
          this.logger.warn(`PDF file not found in S3 for lead visit ${leadVisitId}, generating new one`);
        }
      }

      // Generar nuevo PDF
      return await this.createNewLeadVisitReportPdf(existingLeadVisit);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating lead visit report PDF for visit ${leadVisitId}:`, error);
      throw new InternalServerErrorException('Error al generar el PDF del reporte de visita');
    }
  }

  async getLeadVisitReportDocument(leadVisitId: string): Promise<LeadReportDocumentResponse> {
    try {
      const leadVisit = await this.getLeadVisitWithRelations(leadVisitId);

      if (!leadVisit.reportPdfUrl) {
        throw new NotFoundException('No se ha generado un reporte para esta visita');
      }

      // Verificar que el archivo existe en S3
      const fileExists = await this.awsS3Service.fileExistsByUrl(leadVisit.reportPdfUrl);
      if (!fileExists) {
        throw new NotFoundException('El documento del reporte de visita no se encuentra disponible');
      }

      return {
        leadId: leadVisit.lead.id,
        documentUrl: leadVisit.reportPdfUrl,
        generatedAt: leadVisit.updatedAt,
        clientName: `${leadVisit.lead.firstName} ${leadVisit.lead.lastName}`,
        documentNumber: leadVisit.lead.document,
        leadInfo: {
          documentType: leadVisit.lead.documentType,
          phone: leadVisit.lead.phone,
          source: leadVisit.lead.source?.name || 'Sin fuente',
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting lead visit report document for visit ${leadVisitId}:`, error);
      throw new InternalServerErrorException('Error al obtener el documento del reporte de visita');
    }
  }

  async regenerateLeadVisitReportPdf(leadVisitId: string): Promise<LeadReportGenerationResponse> {
    try {
      const leadVisit = await this.getLeadVisitWithRelations(leadVisitId);

      // Eliminar el archivo anterior si existe
      if (leadVisit.reportPdfUrl) {
        try {
          await this.awsS3Service.deleteFileByUrl(leadVisit.reportPdfUrl);
          this.logger.log(`Previous lead visit report PDF deleted for visit ${leadVisitId}`);
        } catch (error) {
          this.logger.warn(`Failed to delete previous PDF for visit ${leadVisitId}:`, error);
        }
      }

      // Generar nuevo PDF
      return await this.createNewLeadVisitReportPdf(leadVisit);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error regenerating lead visit report PDF for visit ${leadVisitId}:`, error);
      throw new InternalServerErrorException('Error al regenerar el PDF del reporte de visita');
    }
  }

  private async getLeadVisitWithRelations(leadVisitId: string): Promise<LeadVisit> {
    const leadVisit = await this.leadVisitRepository.findOne({
      where: { id: leadVisitId },
      relations: [
        'lead',
        'lead.source',
        'lead.ubigeo',
        'lead.vendor',
        'liner',
        'linerParticipant',
        'telemarketingSupervisor',
        'telemarketingConfirmer',
        'telemarketer',
        'fieldManager',
        'fieldSupervisor',
        'fieldSeller',
        'salesManager',
        'salesGeneralManager',
        'postSale',
        'closer',
      ],
    });

    if (!leadVisit) {
      throw new NotFoundException(`Visita con ID ${leadVisitId} no encontrada`);
    }

    return leadVisit;
  }

  private async createNewLeadVisitReportPdf(leadVisit: LeadVisit): Promise<LeadReportGenerationResponse> {
    try {
      // Obtener información geográfica completa
      let additionalInfo = null;

      if (leadVisit.lead.ubigeo) {
        // Obtener provincia y departamento
        const province = await this.ubigeoRepository.findOne({
          where: { id: leadVisit.lead.ubigeo.parentId },
        });

        let department = null;
        if (province) {
          department = await this.ubigeoRepository.findOne({
            where: { id: province.parentId },
          });
        }

        additionalInfo = {
          districtName: leadVisit.lead.ubigeo.name,
          provinceName: province?.name,
          departmentName: department?.name,
        };
      }

      // Generar PDF
      const pdfData: LeadReportPdfData = {
        lead: leadVisit.lead,
        leadVisit: leadVisit,
        additionalInfo,
      };

      const pdfUrl = await this.reportsLeadsPdfService.generateLeadReportPdf(pdfData);

      // Actualizar la visita con la URL del PDF
      await this.leadVisitRepository.update(leadVisit.id, {
        reportPdfUrl: pdfUrl,
      });

      this.logger.log(`Lead visit report PDF generated successfully for visit ${leadVisit.id}`);

      return {
        leadId: leadVisit.lead.id,
        documentUrl: pdfUrl,
        generatedAt: new Date(),
        clientName: `${leadVisit.lead.firstName} ${leadVisit.lead.lastName}`,
        documentNumber: leadVisit.lead.document,
        leadInfo: {
          documentType: leadVisit.lead.documentType,
          phone: leadVisit.lead.phone,
          source: leadVisit.lead.source?.name || 'Sin fuente',
        },
        isNewDocument: true,
      };
    } catch (error) {
      this.logger.error(`Error creating new lead visit report PDF for visit ${leadVisit.id}:`, error);
      throw new InternalServerErrorException('Error al crear el PDF del reporte de visita');
    }
  }
}
