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
      const existingSale = await this.getSaleWithRelations(saleId);

      // Si ya existe URL, devolver directamente sin verificar en S3
      if (existingSale.paymentAcordPdfUrl) {
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
      }

      return await this.createNewPaymentAcordReportPdf(existingSale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error generating payment acord report PDF for sale ${saleId}:`, error?.stack || error);
      throw new InternalServerErrorException('Error al generar el PDF del acuerdo de pago');
    }
  }

  async getPaymentAcordReportDocument(saleId: string): Promise<PaymentAcordReportDocumentResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);

      if (!sale.paymentAcordPdfUrl) {
        throw new NotFoundException('No se ha generado un acuerdo de pago para esta venta');
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
      this.logger.error(`Error getting payment acord report document for sale ${saleId}:`, error?.stack || error);
      throw new InternalServerErrorException('Error al obtener el documento del acuerdo de pago');
    }
  }

  async regeneratePaymentAcordReportPdf(saleId: string): Promise<PaymentAcordReportGenerationResponse> {
    try {
      const sale = await this.getSaleWithRelations(saleId);

      // Eliminar el archivo anterior en background (no bloquea)
      if (sale.paymentAcordPdfUrl) {
        this.awsS3Service.deleteFileByUrl(sale.paymentAcordPdfUrl).catch((error) => {
          this.logger.warn(`Failed to delete previous PDF for sale ${saleId}: ${error.message}`);
        });
      }

      return await this.createNewPaymentAcordReportPdf(sale);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error regenerating payment acord report PDF for sale ${saleId}:`, error?.stack || error);
      throw new InternalServerErrorException('Error al regenerar el PDF del acuerdo de pago');
    }
  }

  private async getSaleWithRelations(saleId: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id: saleId },
      relations: [
        'client',
        'client.lead',
        'secondaryClientSales',
        'secondaryClientSales.secondaryClient',
        'lot',
        'lot.block',
        'lot.block.stage',
        'lot.block.stage.project',
        'financing',
        'guarantor',
        'vendor',
        'liner',
        'urbanDevelopment',
        'urbanDevelopment.financing',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${saleId} no encontrada`);
    }

    // Cargar solo la primera cuota de financiamiento del lote (si existe)
    if (sale.financing?.id) {
      const firstInstallment = await this.saleRepository.manager.query(
        `SELECT "expectedPaymentDate", "couteAmount" FROM "financing_installments" WHERE "financingId" = $1 ORDER BY "expectedPaymentDate" ASC LIMIT 1`,
        [sale.financing.id],
      );
      (sale.financing as any).financingInstallments = firstInstallment || [];
    }

    // Cargar solo la primera cuota de habilitación urbana (si existe)
    if (sale.urbanDevelopment?.financing?.id) {
      const firstHuInstallment = await this.saleRepository.manager.query(
        `SELECT "expectedPaymentDate", "couteAmount" FROM "financing_installments" WHERE "financingId" = $1 ORDER BY "expectedPaymentDate" ASC LIMIT 1`,
        [sale.urbanDevelopment.financing.id],
      );
      (sale.urbanDevelopment.financing as any).financingInstallments = firstHuInstallment || [];
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

      const s3Url = await this.reportsPaymentAcordPdfService.generatePaymentAcordReportPdf(pdfData);

      await this.saleRepository.update(sale.id, {
        paymentAcordPdfUrl: s3Url,
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
      this.logger.error(`Error creating new payment acord report PDF for sale ${sale.id}:`, error?.stack || error);
      throw new InternalServerErrorException('Error al crear el PDF del acuerdo de pago');
    }
  }
}
