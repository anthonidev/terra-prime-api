import { forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Repository } from 'typeorm';
import { PaymentAcordReportDocumentResponse, PaymentAcordReportGenerationResponse, PaymentAcordReportPdfData } from './interfaces/payment-acord-data.interface';
import { ReportsPaymentAcordPdfService } from './reports-payment-acord.pdf.service';

@Injectable()
export class ReportsPaymentAcordService {
  private readonly logger = new Logger(ReportsPaymentAcordService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @Inject(forwardRef(() => ReportsPaymentAcordPdfService))
    private readonly reportsPaymentAcordPdfService: ReportsPaymentAcordPdfService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async generatePaymentAcordReportPdf(saleId: string): Promise<PaymentAcordReportGenerationResponse> {
    try {
      // Verificar si ya existe un PDF (asumir que agregaste este campo a Sale entity)
      const existingSale = await this.getSaleWithRelations(saleId);
      
      if (existingSale.paymentAcordPdfUrl) { // Campo a agregar en Sale entity
        // Verificar si el archivo aún existe en S3
        const fileExists = await this.awsS3Service.fileExistsByUrl(existingSale.paymentAcordPdfUrl);
        
        if (fileExists) {
          return {
            saleId: existingSale.id,
            documentUrl: existingSale.paymentAcordPdfUrl,
            generatedAt: existingSale.updatedAt,
            clientName: `${existingSale.client.lead.firstName} ${existingSale.client.lead.lastName}`,
            lotName: existingSale.lot.name,
            saleInfo: {
              type: existingSale.type,
              totalAmount: existingSale.totalAmount,
              projectName: existingSale.lot.block.stage.project.name,
            },
            isNewDocument: false,
          };
        } else {
          // El archivo no existe en S3, generar uno nuevo
          this.logger.warn(`PDF file not found in S3 for sale ${saleId}, generating new one`);
        }
      }

      // Generar nuevo PDF
      return await this.createNewPaymentAcordReportPdf(existingSale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating payment acord report PDF for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al generar el PDF del acuerdo de pago');
    }
  }

  async getPaymentAcordReportDocument(saleId: string): Promise<PaymentAcordReportDocumentResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);
      
      if (!sale.paymentAcordPdfUrl) {
        throw new NotFoundException('No se ha generado un acuerdo de pago para esta venta');
      }

      // Verificar que el archivo existe en S3
      const fileExists = await this.awsS3Service.fileExistsByUrl(sale.paymentAcordPdfUrl);
      if (!fileExists) {
        throw new NotFoundException('El documento del acuerdo de pago no se encuentra disponible');
      }

      return {
        saleId: sale.id,
        documentUrl: sale.paymentAcordPdfUrl,
        generatedAt: sale.updatedAt,
        clientName: `${sale.client.lead.firstName} ${sale.client.lead.lastName}`,
        lotName: sale.lot.name,
        saleInfo: {
          type: sale.type,
          totalAmount: sale.totalAmount,
          projectName: sale.lot.block.stage.project.name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting payment acord report document for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al obtener el documento del acuerdo de pago');
    }
  }

  async regeneratePaymentAcordReportPdf(saleId: string): Promise<PaymentAcordReportGenerationResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);
      
      // Eliminar el archivo anterior si existe
      if (sale.paymentAcordPdfUrl) {
        try {
          await this.awsS3Service.deleteFileByUrl(sale.paymentAcordPdfUrl);
          this.logger.log(`Previous payment acord report PDF deleted for sale ${saleId}`);
        } catch (error) {
          this.logger.warn(`Failed to delete previous PDF for sale ${saleId}:`, error);
        }
      }

      // Generar nuevo PDF
      return await this.createNewPaymentAcordReportPdf(sale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error regenerating payment acord report PDF for sale ${saleId}:`, error);
      throw new InternalServerErrorException('Error al regenerar el PDF del acuerdo de pago');
    }
  }

  private async getSaleWithRelations(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: [
        'client',
        'client.lead',                              // Cliente principal
        'secondaryClientSales',                // Relación con clientes secundarios
        'secondaryClientSales.secondaryClient', // Clientes secundarios
        'lot',                                 // Lote
        'lot.block',                          // Manzana
        'lot.block.stage',                    // Etapa
        'lot.block.stage.project',            // Proyecto
        'financing',                          // Financiamiento
        'financing.financingInstallments',    // Cuotas de financiamiento
        'reservation',                        // Reserva
        'guarantor',                          // Garante
        'vendor',                             // Vendedor
        'liner',
        'urbanDevelopment',
        'urbanDevelopment.financing',
        'urbanDevelopment.financing.financingInstallments',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);
    }

    return sale;
  }

  private async createNewPaymentAcordReportPdf(sale: Sale): Promise<PaymentAcordReportGenerationResponse> {
    try {
      const pdfData: PaymentAcordReportPdfData = {
        sale,
        additionalInfo: {
          currentDate: new Date().toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }
      };

      // Generar PDF y subir a S3
      const s3Url = await this.reportsPaymentAcordPdfService.generatePaymentAcordReportPdf(pdfData);
      
      // Actualizar la venta con la URL del PDF
      await this.saleRepository.update(sale.id, {
        paymentAcordPdfUrl: s3Url, // Campo a agregar en Sale entity
      });

      return {
        saleId: sale.id,
        documentUrl: s3Url,
        generatedAt: new Date(),
        clientName: `${sale.client.lead.firstName} ${sale.client.lead.lastName}`,
        lotName: sale.lot.name,
        saleInfo: {
          type: sale.type,
          totalAmount: sale.totalAmount,
          projectName: sale.lot.block.stage.project.name,
        },
        isNewDocument: true,
      };
    } catch (error) {
      this.logger.error('Error creating new payment acord report PDF:', error);
      throw new InternalServerErrorException('Error al crear el PDF del acuerdo de pago');
    }
  }
}