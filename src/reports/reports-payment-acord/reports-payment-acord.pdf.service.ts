import { Injectable, Logger } from '@nestjs/common';
import { PaymentAcordReportPdfData } from './interfaces/payment-acord-data.interface';
import * as PDFDocument from 'pdfkit';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';
import { UrbanDevelopment } from '../../admin-sales/urban-development/entities/urban-development.entity';
import { Financing } from 'src/admin-sales/financing/entities/financing.entity';

@Injectable()
export class ReportsPaymentAcordPdfService {
  private readonly logger = new Logger(ReportsPaymentAcordPdfService.name);
  
  constructor(private readonly awsS3Service: AwsS3Service) {}

  async generatePaymentAcordReportPdf(data: PaymentAcordReportPdfData): Promise<string> {
    try {
      const { sale, additionalInfo } = data;
      
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
            const fileName = `payment-acord-${sale.id}-${Date.now()}.pdf`;
            const s3Url = await this.awsS3Service.uploadPdfFromBuffer(pdfBuffer, fileName, 'documents');
            resolve(s3Url);
          } catch (error) {
            this.logger.error('Error uploading PDF to S3:', error);
            reject(error);
          }
        });

        doc.on('error', reject);

        try {
          this.buildCompletePaymentAcordReportPdf(doc, data);
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

  private buildCompletePaymentAcordReportPdf(doc: PDFKit.PDFDocument, data: PaymentAcordReportPdfData): void {
    const { sale, additionalInfo } = data;
    
    // Configuración de colores
    const primaryColor = '#2c5530'; // Verde oscuro
    const lightGreen = '#e8f5e8';

    // Logo y encabezado
    this.addHeader(doc, sale, additionalInfo?.currentDate || '', primaryColor);
    
    // Título principal
    this.addTitle(doc, primaryColor);

    // Datos personales - TITULAR 1
    let yPosition = this.addMainClientSection(doc, sale.client, primaryColor, lightGreen);

    // Datos personales - TITULAR 2+ (si existen)
    yPosition = this.addSecondaryClientsSection(doc, sale.secondaryClientSales, yPosition, primaryColor, lightGreen);

    // Forma de pago
    yPosition = this.addPaymentSection(doc, sale, yPosition, primaryColor, lightGreen);

    // Firmas
    this.addSignatureSection(doc, sale, yPosition + 40);

    // Footer de la empresa
    this.addFooter(doc);
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 70;

    // Información de la empresa en una sola línea
    doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#000000')
        .text('ventas@inmobiliariashuertas.com      680-5314     Calle Luis Espejo 1097 - La Victoria', 50, footerY, { 
          width: 500, 
          align: 'center' 
        });
}

  private addHeader(doc: PDFKit.PDFDocument, sale: Sale, currentDate: string, primaryColor: string): void {
    const project = sale.lot.block.stage.project;
    
    // Logo del proyecto (usar logo desde BD o nombre como fallback)
    if (project.logo) {
      // TODO: Cargar imagen del logo desde URL si es necesario
      // Por ahora usar el nombre del proyecto
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(project.name, 50, 50);
    } else {
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(project.name, 50, 50);
    }
    
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Porque tu comodidad y satisfacción son nuestra prioridad.', 50, 80);

    // Información del proyecto en la esquina superior derecha
    const rightX = 400;
    doc.fontSize(10)
       .fillColor('#000000')
       .text(`Lima, ${currentDate}`, rightX, 50)
       .text(`Mz. ${sale.lot.block.name} Lote ${sale.lot.name}`, rightX, 65)
       .text(`Área: ${sale.lot.area || sale.lot.lotPrice}m²`, rightX, 80)
       .text(`Eta. ${sale.lot.block.stage.name}`, rightX, 95)
       .text(`Vivienda`, rightX, 110);
  }

  private addTitle(doc: PDFKit.PDFDocument, primaryColor: string): void {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('ACUERDO DE PAGO', 50, 130, { align: 'center' });
  }

  private addMainClientSection(doc: PDFKit.PDFDocument, client: any, primaryColor: string, lightGreen: string): number {
    let yPosition = 170;

    // Título de sección
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('DATOS PERSONALES:', 50, yPosition);

    yPosition += 20;

    // Título TITULAR 1
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('TITULAR 1:', 50, yPosition);

    yPosition += 15;

    // Tabla de datos del cliente principal
    this.addClientDataTable(doc, client, 50, yPosition, lightGreen);

    return yPosition + 100; // Retorna la nueva posición Y
  }

  private addSecondaryClientsSection(doc: PDFKit.PDFDocument, secondaryClientSales: any[], yPosition: number, primaryColor: string, lightGreen: string): number {
    if (!secondaryClientSales || secondaryClientSales.length === 0) {
      // Agregar tabla vacía para TITULAR 2
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('TITULAR 2:', 50, yPosition);
      
      yPosition += 15;
      this.addEmptyClientDataTable(doc, 50, yPosition, lightGreen);
      return yPosition + 100;
    }

    // Agregar cada cliente secundario
    secondaryClientSales.forEach((clientSale, index) => {
      const client = clientSale.secondaryClient;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text(`TITULAR ${index + 2}:`, 50, yPosition);
      
      yPosition += 15;
      this.addClientDataTable(doc, client, 50, yPosition, lightGreen);
      yPosition += 105;
    });

    return yPosition;
  }

  private addClientDataTable(doc: PDFKit.PDFDocument, client: any, x: number, y: number, lightGreen: string): void {
    const tableWidth = 500;
    const rowHeight = 18;
    const col1Width = 140;
    const col2Width = tableWidth - col1Width;

    let clientData = [];
    
    // Verificar si es cliente principal (tiene lead) o secundario
    if (client.lead) {
      // Cliente principal
      clientData = [
        { label: 'Nombres y Apellidos', value: `${client.lead.firstName || ''} ${client.lead.lastName || ''}` },
        { label: 'DNI', value: client.lead.document || '' },
        { label: 'Teléfono de domicilio', value: client.lead.phone || '' },
        { label: 'Dirección', value: client.address || '' },
        { label: 'Correo electrónico', value: client.lead.email || '' }
      ];
    } else {
      // Cliente secundario
      clientData = [
        { label: 'Nombres y Apellidos', value: `${client.firstName || ''} ${client.lastName || ''}` },
        { label: 'DNI', value: client.document || '' },
        { label: 'Teléfono de domicilio', value: client.phone || '' },
        { label: 'Dirección', value: client.address || '' },
        { label: 'Correo electrónico', value: client.email || '' }
      ];
    }

    clientData.forEach((row, index) => {
      const rowY = y + (index * rowHeight);
      
      // Fondo alternado
      if (index % 2 === 0) {
        doc.rect(x, rowY, tableWidth, rowHeight)
           .fillColor(lightGreen)
           .fill();
      }

      // Bordes
      doc.rect(x, rowY, col1Width, rowHeight)
         .stroke();
      doc.rect(x + col1Width, rowY, col2Width, rowHeight)
         .stroke();

      // Texto
      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(row.label, x + 5, rowY + 5, { width: col1Width - 10 });
      
      doc.font('Helvetica')
         .text(row.value, x + col1Width + 5, rowY + 5, { width: col2Width - 10 });
    });
  }

  private addEmptyClientDataTable(doc: PDFKit.PDFDocument, x: number, y: number, lightGreen: string): void {
    const tableWidth = 500;
    const rowHeight = 18;
    const col1Width = 140;
    const col2Width = tableWidth - col1Width;

    const emptyRows = [
      'Nombres y Apellidos',
      'DNI', 
      'Teléfono de domicilio',
      'Dirección',
      'Correo electrónico'
    ];

    emptyRows.forEach((label, index) => {
      const rowY = y + (index * rowHeight);
      
      // Fondo alternado
      if (index % 2 === 0) {
        doc.rect(x, rowY, tableWidth, rowHeight)
           .fillColor(lightGreen)
           .fill();
      }

      // Bordes
      doc.rect(x, rowY, col1Width, rowHeight)
         .stroke();
      doc.rect(x + col1Width, rowY, col2Width, rowHeight)
         .stroke();

      // Texto
      doc.fillColor('#000000')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(label, x + 5, rowY + 5, { width: col1Width - 10 });
    });
  }

  private addPaymentSection(doc: PDFKit.PDFDocument, sale: Sale, yPosition: number, primaryColor: string, lightGreen: string): number {
    // Título de sección
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('FORMA DE PAGO:', 50, yPosition);

    yPosition += 25;

    // Tabla básica de pago
    yPosition = this.addBasicPaymentTable(doc, sale, 50, yPosition, lightGreen);

    // Si es financiado, agregar tabla adicional
    // if (sale.type === SaleType.FINANCED && sale.financing) {
    //   yPosition += 20;
    //   yPosition = this.addFinancingTable(doc, sale.financing, 50, yPosition, lightGreen);
    // }

    yPosition += 20;
    this.addFinancingHuTable(doc, sale, 50, yPosition, lightGreen);

    return yPosition;
  }

  private addBasicPaymentTable(doc: PDFKit.PDFDocument, sale: Sale, x: number, y: number, lightGreen: string): number {
    const headers = ['LOTE', 'PRECIO DE VENTA', 'MONTO INICIAL', 'SEPARACIÓN', 'FECHA DE PAGO', 'MONTO'];
    const colWidths = [60, 90, 90, 90, 90, 80];
    const rowHeight = 30;

    // Encabezados
    let currentX = x;
    headers.forEach((header, index) => {
      doc.rect(currentX, y, colWidths[index], rowHeight)
         .fillColor(lightGreen)
         .fill()
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(header, currentX + 5, y + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    // Fila de datos
    const dataY = y + rowHeight;
    currentX = x;

    const paymentDate = sale.contractDate ? 
      new Date(sale.contractDate).toLocaleDateString('es-PE') : '';
    const initialPayment = Number(sale.financing?.initialAmount || 0);
    const reservationPayment = Number(sale.reservation?.amount || 0);
    const totalAmount = Number(sale.totalAmount || 0);

    const rowData = [
      sale.type === SaleType.FINANCED ? 'FINANCIADO' : 'CONTADO',
      `${totalAmount.toFixed(2)} ${sale.lot.block.stage.project.currency}`,
      `${initialPayment.toFixed(2)} ${sale.lot.block.stage.project.currency}`,
      `${reservationPayment.toFixed(2)} ${sale.lot.block.stage.project.currency}`,
      paymentDate,
      `${initialPayment.toFixed(2)} ${sale.lot.block.stage.project.currency}`
    ];

    rowData.forEach((data, index) => {
      doc.rect(currentX, dataY, colWidths[index], rowHeight)
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica')
         .text(data, currentX + 5, dataY + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    return dataY + rowHeight;
  }

  private addFinancingTable(doc: PDFKit.PDFDocument, sale: Sale, x: number, y: number, lightGreen: string): number {
    // Título para la tabla de financiamiento
    // doc.fontSize(10)
    //    .font('Helvetica-Bold')
    //    .fillColor('#000000')
    //    .text('FINANCIAMIENTO DE LOTE', x, y);

    // y += 20;

    const headers = ['INICIAL', '#CUOTAS', '1ª CUOTA', 'VALOR CUOTA'];
    const colWidths = [125, 125, 125, 125];
    const rowHeight = 25;

    // Encabezados
    let currentX = x;
    headers.forEach((header, index) => {
      doc.rect(currentX, y, colWidths[index], rowHeight)
         .fillColor(lightGreen)
         .fill()
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(header, currentX + 5, y + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    // Fila de datos
    const dataY = y + rowHeight;
    currentX = x;

    const firstInstallment = sale.financing?.financingInstallments?.[0];
    const firstInstallmentDate = firstInstallment?.expectedPaymentDate ? 
      new Date(firstInstallment.expectedPaymentDate).toLocaleDateString('es-PE') : '';
    const installmentAmount = Number(firstInstallment?.couteAmount || 0);
    const initialAmount = Number(sale.financing?.initialAmount || 0);
    const quantityCoutes = Number(sale.financing?.quantityCoutes || 0);

    const financingData = [
      `${initialAmount.toFixed(2)} ${sale.lot.block.stage.project.currency}`,
      quantityCoutes.toString(),
      firstInstallmentDate,
      `${installmentAmount.toFixed(2)} ${sale.lot.block.stage.project.currency}`
    ];

    financingData.forEach((data, index) => {
      doc.rect(currentX, dataY, colWidths[index], rowHeight)
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica')
         .text(data, currentX + 5, dataY + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    return dataY + rowHeight;
  }

  private addFinancingHuTable(doc: PDFKit.PDFDocument, sale: Sale, x: number, y: number, lightGreen: string): number {
    // Título para la tabla de financiamiento
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('HABILITACIÓN URBANA', x, y);

    y += 20;

    const headers = ['TOTAL', '#CUOTAS', '1ª CUOTA', 'VALOR CUOTA'];
    const colWidths = [125, 125, 125, 125];
    const rowHeight = 25;

    // Encabezados
    let currentX = x;
    headers.forEach((header, index) => {
      doc.rect(currentX, y, colWidths[index], rowHeight)
         .fillColor(lightGreen)
         .fill()
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(header, currentX + 5, y + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    // Fila de datos
    const dataY = y + rowHeight;
    currentX = x;

    const firstInstallment = sale.urbanDevelopment?.financing?.financingInstallments?.[0];
    const firstInstallmentDate = firstInstallment?.expectedPaymentDate ? 
      new Date(firstInstallment.expectedPaymentDate).toLocaleDateString('es-PE') : '';
    const installmentAmount = Number(firstInstallment?.couteAmount || 0);
    const initialAmount = Number(sale.urbanDevelopment?.amount || 0);
    const quantityCoutes = Number(sale.urbanDevelopment?.financing?.quantityCoutes || 0);

    const financingData = [
      `${initialAmount.toFixed(2)} ${sale.lot.block.stage.project.currency}`,
      quantityCoutes.toString(),
      firstInstallmentDate,
      `${installmentAmount.toFixed(2)} ${sale.lot.block.stage.project.currency}`
    ];

    financingData.forEach((data, index) => {
      doc.rect(currentX, dataY, colWidths[index], rowHeight)
         .stroke();
      
      doc.fillColor('#000000')
         .fontSize(8)
         .font('Helvetica')
         .text(data, currentX + 5, dataY + 8, { 
           width: colWidths[index] - 10,
           align: 'center'
         });
      
      currentX += colWidths[index];
    });

    return dataY + rowHeight;
  }

  private addSignatureSection(doc: PDFKit.PDFDocument, sale: Sale, yPosition: number): void {
    const signatureY = Math.max(yPosition, 700);

    // Líneas de firma - TITULAR 1 y TITULAR 2 mejor centradas
    const signatureWidth = 150;
    const leftX = 120;  // Más centrado
    const rightX = 330; // Más centrado

    // Firma TITULAR 1
    doc.moveTo(leftX, signatureY)
      .lineTo(leftX + signatureWidth, signatureY)
      .stroke();
    
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('FIRMA TITULAR 1', leftX, signatureY + 10, { 
        width: signatureWidth,
        align: 'center'
      });

    // Firma TITULAR 2
    doc.moveTo(rightX, signatureY)
      .lineTo(rightX + signatureWidth, signatureY)
      .stroke();
    
    doc.text('FIRMA TITULAR 2', rightX, signatureY + 10, { 
      width: signatureWidth,
      align: 'center'
    });

    // Supervisor y Asesor (línea inferior) - mejor balanceados
    const bottomSignatureY = signatureY + 40;

    // Supervisor (línea vacía)
    doc.fontSize(10)
      .font('Helvetica')
      .text('Supervisor:', leftX, bottomSignatureY);

    doc.moveTo(leftX + 70, bottomSignatureY + 7)
      .lineTo(leftX + signatureWidth, bottomSignatureY + 7)
      .stroke();

    // Asesor (vendedor de la venta)
    const vendorName = sale.vendor ? 
      `${sale.vendor.firstName || ''} ${sale.vendor.lastName || ''}`.trim() : '';
    
    doc.text('Asesor:', rightX, bottomSignatureY);
    
    if (vendorName) {
      doc.font('Helvetica-Bold')
        .text(vendorName, rightX + 50, bottomSignatureY);
    }
  }
}