import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { AwsS3Service } from '../../files/aws-s3.service'; 
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';

export interface RadicationPdfData {
  sale: Sale;
  urbanDevelopment?: {
    financing: {
      id: string;
      initialAmount: number;
      interestRate: number;
      quantityCoutes: number;
    };
  };
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly awsS3Service: AwsS3Service) {}

  async generateRadicationPdf(data: RadicationPdfData): Promise<string> {
    try {
      const { sale, urbanDevelopment } = data;
      
      // Crear nuevo documento PDF
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Buffer para almacenar el PDF
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const fileName = `radication-${sale.id}-${Date.now()}.pdf`;
            // Usar tu servicio S3 existente
            const s3Url = await this.awsS3Service.uploadPdfFromBuffer(pdfBuffer, fileName, 'documents');
            resolve(s3Url);
          } catch (error) {
            this.logger.error('Error uploading PDF to S3:', error);
            reject(error);
          }
        });

        doc.on('error', reject);

        try {
          this.buildRadicationPdf(doc, data);
          doc.end();
        } catch (error) {
          this.logger.error('Error building PDF:', error);
          reject(error);
        }
      });
    } catch (error) {
      this.logger.error('Error generating PDF:', error);
      throw error;
    }
  }

  private buildRadicationPdf(doc: PDFKit.PDFDocument, data: RadicationPdfData): void {
    const { sale, urbanDevelopment } = data;
    
    // Configuración de fuentes y colores
    const primaryColor = '#2c5234';
    const secondaryColor = '#666666';

    // Header con logo y título
    this.addHeader(doc, primaryColor);
    
    // Título principal
    doc.fontSize(18)
       .fillColor(primaryColor)
       .text('HOJA DE RADICACIÓN DE VENTAS', 50, 160, { align: 'center' });

    let yPosition = 220;

    // Sección 1: Información básica de la venta
    yPosition = this.addBasicSaleInfo(doc, sale, yPosition, primaryColor, secondaryColor);
    
    // Sección 2: Información de habilitación urbana (si aplica)
    if (urbanDevelopment) {
      yPosition = this.addUrbanDevelopmentInfo(doc, urbanDevelopment, yPosition, primaryColor, secondaryColor);
    }
    
    // Sección 3: Participantes
    yPosition = this.addParticipantsInfo(doc, sale, yPosition, primaryColor, secondaryColor);

    // Footer
    this.addFooter(doc);
  }

  private addHeader(doc: PDFKit.PDFDocument, primaryColor: string): void {
    // Rectángulo header
    doc.rect(0, 0, doc.page.width, 120)
       .fillColor('#f8f9fa')
       .fill();

    // Logo placeholder (puedes agregar imagen real aquí)
    doc.rect(50, 20, 80, 80)
       .fillColor(primaryColor)
       .fill();
    
    doc.fontSize(12)
       .fillColor(primaryColor)
       .text('EL OLIVAR', 55, 55);

    // Información de contabilidad
    doc.fontSize(10)
       .fillColor('#000000')
       .text('CONTABILIDAD', doc.page.width - 150, 30)
       .text(`N°: _____________`, doc.page.width - 150, 50)
       .text(`Fecha: ___/___/___`, doc.page.width - 150, 70);
  }

  private addBasicSaleInfo(
    doc: PDFKit.PDFDocument, 
    sale: Sale, 
    startY: number, 
    primaryColor: string, 
    secondaryColor: string
  ): number {
    let yPos = startY;

    // Título de sección
    doc.fontSize(12)
       .fillColor(primaryColor)
       .text('INFORMACIÓN DE LA VENTA', 50, yPos);
    
    yPos += 30;

    // Información en dos columnas
    const leftCol = 50;
    const rightCol = 300;
    const lineHeight = 25;

    // Fecha
    doc.fontSize(10)
       .fillColor('#000000')
       .text('FECHA:', leftCol, yPos)
       .text(sale.contractDate ? this.formatDate(sale.contractDate) : '_____________', leftCol + 60, yPos);

    yPos += lineHeight;

    // Cliente
    const clientName = `${sale.client.lead.firstName} ${sale.client.lead.lastName}`;
    doc.text('CLIENTE:', leftCol, yPos)
       .text(clientName, leftCol + 60, yPos);

    yPos += lineHeight;

    // Manzana y Lote
    doc.text('MANZANA:', leftCol, yPos)
       .text(sale.lot.block.name, leftCol + 80, yPos)
       .text('LOTE:', rightCol, yPos)
       .text(sale.lot.name, rightCol + 40, yPos);

    yPos += lineHeight;

    // Separación (Reserva)
    doc.text('SEPARACIÓN:', leftCol, yPos);
    const reservationAmount = sale.reservation ? sale.reservation.amount.toString() : '';
    doc.text(reservationAmount, leftCol + 80, yPos);

    // Cuota inicial
    doc.text('CUOTA INICIAL:', rightCol, yPos);
    const initialAmount = sale.financing?.initialAmount?.toString() || '';
    doc.text(initialAmount, rightCol + 90, yPos);

    yPos += lineHeight;

    // Total
    doc.text('TOTAL:', leftCol, yPos)
       .text(sale.totalAmount.toString(), leftCol + 60, yPos);

    // Tipo de venta
    doc.text('CASH:', rightCol, yPos);
    const isCash = sale.type === 'DIRECT_PAYMENT';
    doc.rect(rightCol + 35, yPos - 2, 12, 12)
       .stroke();
    if (isCash) {
      doc.text('✓', rightCol + 38, yPos);
    }

    doc.text('FINANCIAMIENTO:', rightCol + 60, yPos);
    doc.rect(rightCol + 150, yPos - 2, 12, 12)
       .stroke();
    if (!isCash) {
      doc.text('✓', rightCol + 153, yPos);
    }

    return yPos + 40;
  }

  private addUrbanDevelopmentInfo(
    doc: PDFKit.PDFDocument, 
    urbanDevelopment: any, 
    startY: number, 
    primaryColor: string, 
    secondaryColor: string
  ): number {
    let yPos = startY;

    // Fondo gris para la sección
    doc.rect(50, yPos - 10, doc.page.width - 100, 100)
       .fillColor('#f0f0f0')
       .fill();

    // Título de sección
    doc.fontSize(12)
       .fillColor(primaryColor)
       .text('HABILITACIÓN URBANA', 50, yPos);
    
    yPos += 30;

    const leftCol = 70;
    const rightCol = 300;
    const lineHeight = 25;

    // Monto de habilitación urbana
    doc.fontSize(10)
       .fillColor('#000000')
       .text('HABILITACIÓN URBANA:', leftCol, yPos)
       .text(urbanDevelopment.financing.initialAmount?.toString() || '', leftCol + 150, yPos);

    yPos += lineHeight;

    // Número de cuotas
    doc.text('NÚMERO DE CUOTAS:', leftCol, yPos)
       .text(urbanDevelopment.financing.quantityCoutes?.toString() || '', leftCol + 130, yPos);

    // Valor de cuota
    doc.text('VALOR DE CUOTA:', rightCol, yPos)
       .text('_____________', rightCol + 100, yPos);

    yPos += lineHeight;

    // Fecha de pago
    doc.text('FECHA DE PAGO:', leftCol, yPos)
       .text('___/___/___', leftCol + 100, yPos);

    return yPos + 50;
  }

  private addParticipantsInfo(
    doc: PDFKit.PDFDocument, 
    sale: Sale, 
    startY: number, 
    primaryColor: string, 
    secondaryColor: string
  ): number {
    let yPos = startY;

    // Título de sección
    doc.fontSize(12)
       .fillColor(primaryColor)
       .text('PARTICIPANTES', 50, yPos);
    
    yPos += 30;

    const lineHeight = 20;

    // Lista de participantes
    const participants = [
      { type: 'JEFE DE VENTAS', name: sale.fieldManager ? `${sale.fieldManager.firstName} ${sale.fieldManager.lastName}` : '' },
      { type: 'CIERRE', name: sale.fieldSeller ? `${sale.fieldSeller.firstName} ${sale.fieldSeller.lastName}` : '' },
      { type: 'LÍNEA', name: sale.liner ? `${sale.liner.firstName} ${sale.liner.lastName}` : '' },
      { type: 'SUPERVISOR DE TLMK', name: sale.telemarketingSupervisor ? `${sale.telemarketingSupervisor.firstName} ${sale.telemarketingSupervisor.lastName}` : '' },
      { type: 'CONFIRMADOR TLMK', name: sale.telemarketingConfirmer ? `${sale.telemarketingConfirmer.firstName} ${sale.telemarketingConfirmer.lastName}` : '' },
      { type: 'TLMK', name: sale.telemarketer ? `${sale.telemarketer.firstName} ${sale.telemarketer.lastName}` : '' },
    ];

    participants.forEach((participant) => {
      if (participant.name) {
        doc.fontSize(10)
           .fillColor('#000000')
           .text(`${participant.type}:`, 70, yPos)
           .text(participant.name, 200, yPos);
        yPos += lineHeight;
      } else {
        doc.fontSize(10)
           .fillColor('#000000')
           .text(`${participant.type}:`, 70, yPos)
           .text('_____________________', 200, yPos);
        yPos += lineHeight;
      }
    });

    return yPos + 30;
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const footerY = doc.page.height - 80;
    
    doc.fontSize(8)
       .fillColor('#666666')
       .text('📍 Calle Luis Espejo 1097 - La Victoria', 50, footerY, { align: 'center' })
       .text('📞 Teléfono: ___________', 50, footerY + 15, { align: 'center' });
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}