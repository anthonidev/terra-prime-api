import { Injectable, Logger } from '@nestjs/common';
import { PaymentAcordReportPdfData } from './interfaces/payment-acord-data.interface';
import * as PDFDocument from 'pdfkit';

import { AwsS3Service } from 'src/files/aws-s3.service';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';

@Injectable()
export class ReportsPaymentAcordPdfService {
  private readonly logger = new Logger(ReportsPaymentAcordPdfService.name);

  private readonly ACCENT_COLOR = '#2c5234';
  private readonly ACCENT_LIGHT = '#e8f0ea';
  private readonly TEXT_PRIMARY = '#1a1a1a';
  private readonly TEXT_MUTED = '#666666';
  private readonly PAGE_BG = '#f3f4f6';
  private readonly CARD_BG = '#ffffff';
  private readonly CARD_BORDER = '#e2e4e8';
  private readonly BORDER_COLOR = '#d0d0d0';
  private readonly LEFT = 50;
  private readonly RIGHT = 50;
  private readonly ROW_H = 20;
  private readonly GAP = 8;
  private readonly CARD_PAD = 10;
  private readonly CARD_RADIUS = 8;

  constructor(private readonly awsS3Service: AwsS3Service) {}

  async generatePaymentAcordReportPdf(
    data: PaymentAcordReportPdfData,
  ): Promise<string> {
    const { sale } = data;
    this.logger.log(`Generating payment accord PDF for sale ${sale.id}`);

    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 30, left: this.LEFT, right: this.RIGHT },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));

      return new Promise((resolve, reject) => {
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const fileName = `payment-acord-${sale.id}-${Date.now()}.pdf`;
            const s3Url = await this.awsS3Service.uploadPdfFromBuffer(
              pdfBuffer,
              fileName,
              'documents',
            );
            this.logger.log(
              `Payment accord PDF uploaded successfully for sale ${sale.id}`,
            );
            resolve(s3Url);
          } catch (error) {
            this.logger.error(
              `Error uploading payment accord PDF to S3 for sale ${sale.id}`,
              error?.stack || error,
            );
            reject(error);
          }
        });

        doc.on('error', reject);

        try {
          this.buildCompletePdf(doc, data);
          doc.end();
          this.logger.log(
            `Payment accord PDF built successfully for sale ${sale.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Error building payment accord PDF for sale ${sale.id}`,
            error?.stack || error,
          );
          reject(error);
        }
      });
    } catch (error) {
      this.logger.error(
        `Error generating payment accord PDF for sale ${sale.id}`,
        error?.stack || error,
      );
      throw error;
    }
  }

  private get contentWidth(): number {
    return 595.28 - this.LEFT - this.RIGHT;
  }

  // ===================== MAIN BUILD =====================

  private buildCompletePdf(
    doc: PDFKit.PDFDocument,
    data: PaymentAcordReportPdfData,
  ): void {
    const { sale, additionalInfo } = data;

    this.logger.debug(
      `Building PDF - client: ${!!sale.client}, financing: ${!!sale.financing}, lot: ${!!sale.lot}, secondaryClients: ${sale.secondaryClientSales?.length || 0}`,
    );

    // Page background
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fillColor(this.PAGE_BG)
      .fill();

    let y = this.addHeader(
      doc,
      sale,
      additionalInfo?.currentDate || '',
    );
    y = this.addMainClientSection(doc, sale.client, y);
    y = this.addSecondaryClientsSection(doc, sale.secondaryClientSales, y);
    y = this.addPaymentSection(doc, sale, y);
    this.addSignatureSection(doc, sale, y);
    this.addFooter(doc);
  }

  // ===================== CARD HELPER =====================

  private drawCard(doc: PDFKit.PDFDocument, y: number, height: number): void {
    const x = this.LEFT - 4;
    const w = this.contentWidth + 8;

    // Shadow
    doc
      .roundedRect(x + 1, y + 1, w, height, this.CARD_RADIUS)
      .fillColor('#dcdee2')
      .fill();

    // White background
    doc
      .roundedRect(x, y, w, height, this.CARD_RADIUS)
      .fillColor(this.CARD_BG)
      .fill();

    // Border
    doc
      .roundedRect(x, y, w, height, this.CARD_RADIUS)
      .strokeColor(this.CARD_BORDER)
      .lineWidth(0.5)
      .stroke();
  }

  // ===================== SECTION HELPERS =====================

  private drawSectionTitle(
    doc: PDFKit.PDFDocument,
    title: string,
    y: number,
  ): number {
    doc
      .rect(this.LEFT + 2, y + 2, 3, 13)
      .fillColor(this.ACCENT_COLOR)
      .fill();

    doc
      .fontSize(11)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text(title.toUpperCase(), this.LEFT + 12, y + 2);

    doc.y = y + 20;
    return y + 20;
  }

  private drawField(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
  ): void {
    doc.fontSize(9).font('Helvetica');
    const lw = doc.widthOfString(label);

    doc.fillColor(this.TEXT_MUTED).text(label, x, y);
    doc
      .fontSize(10)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text(value || '—', x + lw + 5, y);

    doc.y = y;
  }

  private drawUnderline(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
  ): void {
    doc
      .save()
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(0.5)
      .moveTo(x, y)
      .lineTo(x + width, y)
      .stroke()
      .restore();
  }

  // ===================== HEADER =====================

  private addHeader(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    currentDate: string,
  ): number {
    doc
      .fontSize(14)
      .fillColor(this.ACCENT_COLOR)
      .font('Helvetica-Bold')
      .text('HUERTAS', this.LEFT, 28);

    // Right side: date + lot info
    const rightX = doc.page.width - this.RIGHT - 140;
    doc
      .fontSize(10)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text(
        `Lima, ${currentDate}`,
        rightX,
        20,
        { width: 140, align: 'right' },
      );

    if (sale.lot) {
      doc
        .fontSize(9)
        .fillColor(this.TEXT_PRIMARY)
        .font('Helvetica')
        .text(
          `Mz. ${sale.lot.block?.name || ''} Lote ${sale.lot.name || ''}`,
          rightX,
          35,
          { width: 140, align: 'right' },
        )
        .text(
          `Área: ${sale.lot.area || sale.lot.lotPrice || ''}m²`,
          rightX,
          48,
          { width: 140, align: 'right' },
        )
        .text(
          `Etapa: ${sale.lot.block?.stage?.name || ''}`,
          rightX,
          61,
          { width: 140, align: 'right' },
        );
    }

    // Title
    doc
      .fontSize(16)
      .fillColor(this.ACCENT_COLOR)
      .font('Helvetica-Bold')
      .text('ACUERDO DE PAGO', this.LEFT, 75, {
        width: this.contentWidth,
        align: 'center',
      });

    doc.y = 98;
    return 98;
  }

  // ===================== MAIN CLIENT =====================

  private addMainClientSection(
    doc: PDFKit.PDFDocument,
    client: any,
    startY: number,
  ): number {
    this.logger.debug(
      `Adding main client section - client: ${!!client}, lead: ${!!client?.lead}`,
    );

    const rows = 3;
    const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Datos Personales - Titular 1', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    const firstName = client?.lead?.firstName || '';
    const lastName = client?.lead?.lastName || '';
    this.drawField(
      doc,
      'Nombre',
      `${firstName} ${lastName}`.trim().toUpperCase() || '—',
      col1,
      y,
    );
    this.drawField(doc, 'DNI', client?.lead?.document || '', col2, y);
    y += this.ROW_H;

    this.drawField(doc, 'Teléfono', client?.lead?.phone || '', col1, y);
    this.drawField(doc, 'Dirección', client?.address || '', col2, y);
    y += this.ROW_H;

    this.drawField(doc, 'Email', client?.lead?.email || '', col1, y);
    y += this.ROW_H;

    return startY + cardH + this.GAP;
  }

  // ===================== SECONDARY CLIENTS =====================

  private addSecondaryClientsSection(
    doc: PDFKit.PDFDocument,
    secondaryClientSales: any[],
    startY: number,
  ): number {
    if (!secondaryClientSales || secondaryClientSales.length === 0) {
      // Empty card for Titular 2
      const rows = 3;
      const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
      this.drawCard(doc, startY, cardH);

      let y = startY + this.CARD_PAD;
      y = this.drawSectionTitle(doc, 'Datos Personales - Titular 2', y);

      const col1 = this.LEFT + 12;
      const col2 = this.LEFT + this.contentWidth / 2;

      this.drawField(doc, 'Nombre', '—', col1, y);
      this.drawField(doc, 'DNI', '—', col2, y);
      y += this.ROW_H;

      this.drawField(doc, 'Teléfono', '—', col1, y);
      this.drawField(doc, 'Dirección', '—', col2, y);
      y += this.ROW_H;

      this.drawField(doc, 'Email', '—', col1, y);

      return startY + cardH + this.GAP;
    }

    let currentY = startY;

    secondaryClientSales.forEach((clientSale, index) => {
      const client = clientSale.secondaryClient;
      const rows = 3;
      const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
      this.drawCard(doc, currentY, cardH);

      let y = currentY + this.CARD_PAD;
      y = this.drawSectionTitle(
        doc,
        `Datos Personales - Titular ${index + 2}`,
        y,
      );

      const col1 = this.LEFT + 12;
      const col2 = this.LEFT + this.contentWidth / 2;

      const firstName = client?.firstName || '';
      const lastName = client?.lastName || '';
      this.drawField(
        doc,
        'Nombre',
        `${firstName} ${lastName}`.trim().toUpperCase() || '—',
        col1,
        y,
      );
      this.drawField(doc, 'DNI', client?.document || '', col2, y);
      y += this.ROW_H;

      this.drawField(doc, 'Teléfono', client?.phone || '', col1, y);
      this.drawField(doc, 'Dirección', client?.address || '', col2, y);
      y += this.ROW_H;

      this.drawField(doc, 'Email', client?.email || '', col1, y);

      currentY += cardH + this.GAP;
    });

    return currentY;
  }

  // ===================== PAYMENT SECTION =====================

  private addPaymentSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    startY: number,
  ): number {
    this.logger.debug(
      `Adding payment section - financing: ${!!sale.financing}, urbanDevelopment: ${!!sale.urbanDevelopment}`,
    );

    // --- Main payment table ---
    const tableHeaderH = 22;
    const tableRowH = 22;
    const mainTableH =
      this.CARD_PAD + 20 + tableHeaderH + tableRowH + this.CARD_PAD;

    this.drawCard(doc, startY, mainTableH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Forma de Pago', y);

    const headers = [
      'LOTE',
      'PRECIO VENTA',
      'MONTO INICIAL',
      'SEPARACIÓN',
      'FECHA PAGO',
      'MONTO',
    ];
    const colWidths = [58, 88, 88, 82, 82, 82];
    const tableX = this.LEFT + 6;

    // Header row
    // Draw full header row background with rounded corners
    const totalTableW = colWidths.reduce((a, b) => a + b, 0);
    doc
      .roundedRect(tableX, y, totalTableW, tableHeaderH, 4)
      .fillColor(this.ACCENT_LIGHT)
      .fill();

    let cx = tableX;
    headers.forEach((header, i) => {
      doc
        .fontSize(7.5)
        .fillColor(this.ACCENT_COLOR)
        .font('Helvetica-Bold')
        .text(header, cx + 3, y + 6, {
          width: colWidths[i] - 6,
          align: 'center',
        });
      cx += colWidths[i];
    });

    // Data row
    y += tableHeaderH;
    cx = tableX;

    const currency = sale.lot?.block?.stage?.project?.currency || '';
    const paymentDate = sale.contractDate
      ? new Date(sale.contractDate).toLocaleDateString('es-PE')
      : '';
    const initialPayment = Number(sale.financing?.initialAmount || 0);
    const reservationPayment = Number(sale.reservationAmount || 0);
    const totalAmount = Number(sale.totalAmount || 0);

    const rowData = [
      sale.type === SaleType.FINANCED ? 'FINANCIADO' : 'CONTADO',
      `${totalAmount.toFixed(2)} ${currency}`,
      `${initialPayment.toFixed(2)} ${currency}`,
      `${reservationPayment.toFixed(2)} ${currency}`,
      paymentDate,
      `${initialPayment.toFixed(2)} ${currency}`,
    ];

    rowData.forEach((data, i) => {
      doc
        .rect(cx, y, colWidths[i], tableRowH)
        .fillColor(this.CARD_BG)
        .fill();
      // Bottom border
      doc
        .save()
        .strokeColor(this.CARD_BORDER)
        .lineWidth(0.3)
        .moveTo(cx, y + tableRowH)
        .lineTo(cx + colWidths[i], y + tableRowH)
        .stroke()
        .restore();
      doc
        .fontSize(8)
        .fillColor(this.TEXT_PRIMARY)
        .font('Helvetica')
        .text(data, cx + 3, y + 6, {
          width: colWidths[i] - 6,
          align: 'center',
        });
      cx += colWidths[i];
    });

    let nextY = startY + mainTableH + this.GAP;

    // --- Urban development table ---
    const huTableH =
      this.CARD_PAD + 20 + tableHeaderH + tableRowH + this.CARD_PAD;
    this.drawCard(doc, nextY, huTableH);

    y = nextY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Habilitación Urbana', y);

    const huHeaders = ['TOTAL', '#CUOTAS', '1ª CUOTA', 'VALOR CUOTA'];
    const huColWidths = [120, 120, 120, 120];

    cx = tableX;
    // Draw full HU header row background with rounded corners
    const huTotalW = huColWidths.reduce((a, b) => a + b, 0);
    doc
      .roundedRect(tableX, y, huTotalW, tableHeaderH, 4)
      .fillColor(this.ACCENT_LIGHT)
      .fill();

    huHeaders.forEach((header, i) => {
      doc
        .fontSize(8)
        .fillColor(this.ACCENT_COLOR)
        .font('Helvetica-Bold')
        .text(header, cx + 3, y + 6, {
          width: huColWidths[i] - 6,
          align: 'center',
        });
      cx += huColWidths[i];
    });

    y += tableHeaderH;
    cx = tableX;

    const huFinancing = sale.urbanDevelopment?.financing;
    const huFirstInstallment = huFinancing?.financingInstallments?.[0];
    const huFirstDate = huFirstInstallment?.expectedPaymentDate
      ? new Date(huFirstInstallment.expectedPaymentDate).toLocaleDateString(
          'es-PE',
        )
      : '';
    const huInstallmentAmount = Number(huFirstInstallment?.couteAmount || 0);
    const huTotal = Number(sale.urbanDevelopment?.amount || 0);
    const huQuantity = Number(huFinancing?.quantityCoutes || 0);

    const huRowData = [
      `${huTotal.toFixed(2)} ${currency}`,
      huQuantity.toString(),
      huFirstDate,
      `${huInstallmentAmount.toFixed(2)} ${currency}`,
    ];

    huRowData.forEach((data, i) => {
      doc
        .rect(cx, y, huColWidths[i], tableRowH)
        .fillColor(this.CARD_BG)
        .fill();
      doc
        .save()
        .strokeColor(this.CARD_BORDER)
        .lineWidth(0.3)
        .moveTo(cx, y + tableRowH)
        .lineTo(cx + huColWidths[i], y + tableRowH)
        .stroke()
        .restore();
      doc
        .fontSize(8)
        .fillColor(this.TEXT_PRIMARY)
        .font('Helvetica')
        .text(data, cx + 3, y + 6, {
          width: huColWidths[i] - 6,
          align: 'center',
        });
      cx += huColWidths[i];
    });

    return nextY + huTableH + this.GAP;
  }

  // ===================== SIGNATURES =====================

  private addSignatureSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    startY: number,
  ): void {
    const signatureW = 160;
    const col1X = this.LEFT + 40;
    const col2X = this.LEFT + this.contentWidth - signatureW - 40;

    let y = startY + 20;

    // Titular 1
    this.drawUnderline(doc, col1X, y, signatureW);
    doc
      .fontSize(9)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text('FIRMA TITULAR 1', col1X, y + 5, {
        width: signatureW,
        align: 'center',
      });

    // Titular 2
    this.drawUnderline(doc, col2X, y, signatureW);
    doc
      .fontSize(9)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text('FIRMA TITULAR 2', col2X, y + 5, {
        width: signatureW,
        align: 'center',
      });

    y += 40;

    // Supervisor
    doc
      .fontSize(9)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text('Supervisor:', col1X, y);
    this.drawUnderline(doc, col1X + 65, y + 8, signatureW - 65);

    // Asesor
    const vendorName = sale.vendor
      ? `${sale.vendor.firstName || ''} ${sale.vendor.lastName || ''}`.trim()
      : '';
    doc
      .fontSize(9)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text('Asesor:', col2X, y);
    if (vendorName) {
      doc
        .fontSize(9)
        .fillColor(this.TEXT_PRIMARY)
        .font('Helvetica-Bold')
        .text(vendorName, col2X + 50, y);
    } else {
      this.drawUnderline(doc, col2X + 50, y + 8, signatureW - 50);
    }
  }

  // ===================== FOOTER =====================

  private addFooter(doc: PDFKit.PDFDocument): void {
    const footerY = doc.page.height - 50;

    doc
      .save()
      .strokeColor(this.ACCENT_COLOR)
      .lineWidth(1)
      .moveTo(this.LEFT, footerY - 8)
      .lineTo(this.LEFT + this.contentWidth, footerY - 8)
      .stroke()
      .restore();

    doc
      .fontSize(8.5)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text(
        '984 403 259   |   Calle Luis Espejo 1097 Of. 803 - La Victoria   |   ventas@inmobiliariahuertas.com',
        this.LEFT,
        footerY + 10,
        { width: this.contentWidth, align: 'center' },
      );
  }
}
