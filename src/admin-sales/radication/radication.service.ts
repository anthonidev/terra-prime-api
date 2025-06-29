import { 
  Injectable, 
  NotFoundException, 
  InternalServerErrorException,
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { PdfService } from '../../common/services/pdf.service';
import { AwsS3Service } from '../../files/aws-s3.service'; 
import { UrbanDevelopmentService } from '../urban-development/urban-development.service';

export interface RadicationDocumentResponse {
  saleId: string;
  documentUrl: string;
  generatedAt: Date;
  clientName: string;
  lotInfo: {
    block: string;
    lot: string;
    project: string;
  };
}

export interface RadicationGenerationResponse extends RadicationDocumentResponse {
  isNewDocument: boolean;
}

@Injectable()
export class RadicationService {
  private readonly logger = new Logger(RadicationService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly pdfService: PdfService,
    private readonly awsS3Service: AwsS3Service, 
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
  ) {}

  async generateRadicationPdf(saleId: string): Promise<RadicationGenerationResponse> {
    try {
      // Verificar si ya existe un PDF
      const existingSale = await this.getSaleWithRelations(saleId);
      
      if (existingSale.radicationPdfUrl) {
        // Verificar si el archivo aún existe en S3
        const fileExists = await this.awsS3Service.fileExistsByUrl(existingSale.radicationPdfUrl);
        
        if (fileExists) {
          return {
            saleId: existingSale.id,
            documentUrl: existingSale.radicationPdfUrl,
            generatedAt: existingSale.updatedAt,
            clientName: `${existingSale.client.lead.firstName} ${existingSale.client.lead.lastName}`,
            lotInfo: {
              block: existingSale.lot.block.name,
              lot: existingSale.lot.name,
              project: existingSale.lot.block.stage.project.name,
            },
            isNewDocument: false,
          };
        } else {
          // El archivo no existe en S3, generar uno nuevo
          this.logger.warn(`PDF file not found in S3 for sale ${saleId}, generating new one`);
        }
      }

      // Generar nuevo PDF
      return await this.createNewRadicationPdf(existingSale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating radication PDF for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al generar el PDF de radicación');
    }
  }

  async getRadicationDocument(saleId: string): Promise<RadicationDocumentResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);
      
      if (!sale.radicationPdfUrl) {
        throw new NotFoundException('No se ha generado un documento de radicación para esta venta');
      }

      // Verificar que el archivo existe en S3
      const fileExists = await this.awsS3Service.fileExistsByUrl(sale.radicationPdfUrl);
      if (!fileExists) {
        throw new NotFoundException('El documento de radicación no se encuentra disponible');
      }

      return {
        saleId: sale.id,
        documentUrl: sale.radicationPdfUrl,
        generatedAt: sale.updatedAt,
        clientName: `${sale.client.lead.firstName} ${sale.client.lead.lastName}`,
        lotInfo: {
          block: sale.lot.block.name,
          lot: sale.lot.name,
          project: sale.lot.block.stage.project.name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting radication document for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al obtener el documento de radicación');
    }
  }

  async regenerateRadicationPdf(saleId: string): Promise<RadicationGenerationResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);
      
      // Eliminar el archivo anterior si existe
      if (sale.radicationPdfUrl) {
        try {
          await this.awsS3Service.deleteFileByUrl(sale.radicationPdfUrl);
          this.logger.log(`Previous radication PDF deleted for sale ${saleId}`);
        } catch (error) {
          this.logger.warn(`Failed to delete previous PDF for sale ${saleId}:`, error);
        }
      }

      // Generar nuevo PDF
      return await this.createNewRadicationPdf(sale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error regenerating radication PDF for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al regenerar el PDF de radicación');
    }
  }

  private async getSaleWithRelations(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: [
        'client',
        'client.lead',
        'lot',
        'lot.block',
        'lot.block.stage',
        'lot.block.stage.project',
        'financing',
        'reservation',
        'guarantor',
        'vendor',
        'liner',
        'telemarketingSupervisor',
        'telemarketingConfirmer',
        'telemarketer',
        'fieldManager',
        'fieldSupervisor',
        'fieldSeller',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);
    }

    return sale;
  }

  private async createNewRadicationPdf(sale: Sale): Promise<RadicationGenerationResponse> {
    try {
      // Obtener información de habilitación urbana si existe
      let urbanDevelopment = null;
      try {
        const urbanDev = await this.urbanDevelopmentService.findOneBySaleId(sale.id);
        if (urbanDev) {
          urbanDevelopment = {
            financing: {
              id: urbanDev.financing.id,
              initialAmount: urbanDev.initialAmount,
              interestRate: urbanDev.financing.interestRate,
              quantityCoutes: urbanDev.financing.quantityCoutes,
            },
          };
        }
      } catch (error) {
        this.logger.warn(`No urban development found for sale ${sale.id}`);
      }

      // Generar PDF
      const pdfData = {
        sale,
        urbanDevelopment,
      };

      const pdfUrl = await this.pdfService.generateRadicationPdf(pdfData);

      // Actualizar la venta con la URL del PDF
      await this.saleRepository.update(sale.id, {
        radicationPdfUrl: pdfUrl,
      });

      this.logger.log(`Radication PDF generated successfully for sale ${sale.id}`);

      return {
        saleId: sale.id,
        documentUrl: pdfUrl,
        generatedAt: new Date(),
        clientName: `${sale.client.lead.firstName} ${sale.client.lead.lastName}`,
        lotInfo: {
          block: sale.lot.block.name,
          lot: sale.lot.name,
          project: sale.lot.block.stage.project.name,
        },
        isNewDocument: true,
      };
    } catch (error) {
      this.logger.error(`Error creating new radication PDF for sale ${sale.id}:`, error);
      throw new InternalServerErrorException('Error al crear el PDF de radicación');
    }
  }
}