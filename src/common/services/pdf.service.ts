import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

import { AwsS3Service } from '../../files/aws-s3.service';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';

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

  async generateRadicationPdf(data: RadicationPdfData): Promise<string> {
    const { sale } = data;
    this.logger.log(`Building radication PDF for sale ${sale.id}`);

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
            const fileName = `radication-${sale.id}-${Date.now()}.pdf`;
            const s3Url = await this.awsS3Service.uploadPdfFromBuffer(
              pdfBuffer,
              fileName,
              'documents',
            );
            this.logger.log(
              `Radication PDF uploaded successfully for sale ${sale.id}`,
            );
            resolve(s3Url);
          } catch (error) {
            this.logger.error(
              `Error uploading radication PDF to S3 for sale ${sale.id}`,
              error?.stack || error,
            );
            reject(error);
          }
        });

        doc.on('error', reject);

        try {
          this.buildRadicationPdf(doc, data);
          doc.end();
          this.logger.log(
            `Radication PDF built successfully for sale ${sale.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Error building radication PDF for sale ${sale.id}`,
            error?.stack || error,
          );
          reject(error);
        }
      });
    } catch (error) {
      this.logger.error(
        `Error generating radication PDF for sale ${sale.id}`,
        error?.stack || error,
      );
      throw error;
    }
  }

  private get contentWidth(): number {
    return 595.28 - this.LEFT - this.RIGHT;
  }

  // ===================== MAIN BUILD =====================

  private buildRadicationPdf(
    doc: PDFKit.PDFDocument,
    data: RadicationPdfData,
  ): void {
    const { sale, urbanDevelopment } = data;

    if (!sale.lot) this.logger.warn(`Sale ${sale.id}: lot relation is null`);
    if (!sale.client)
      this.logger.warn(`Sale ${sale.id}: client relation is null`);
    if (!sale.financing)
      this.logger.warn(`Sale ${sale.id}: financing relation is null`);

    // Page background
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fillColor(this.PAGE_BG)
      .fill();

    let y = this.addHeader(doc, sale);
    y = this.addSaleInfoSection(doc, sale, y);

    if (urbanDevelopment) {
      y = this.addUrbanDevelopmentSection(doc, urbanDevelopment, y);
    }

    y = this.addParticipantsSection(doc, sale, y);
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

  private drawCheckbox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    checked: boolean,
  ): void {
    const size = 10;
    if (checked) {
      doc.roundedRect(x, y, size, size, 2).fillColor(this.ACCENT_COLOR).fill();
      doc
        .save()
        .strokeColor('#ffffff')
        .lineWidth(1.5)
        .moveTo(x + 2, y + 5)
        .lineTo(x + 4, y + 7.5)
        .lineTo(x + 8, y + 2.5)
        .stroke()
        .restore();
    } else {
      doc
        .roundedRect(x, y, size, size, 2)
        .strokeColor(this.BORDER_COLOR)
        .lineWidth(0.5)
        .stroke();
    }
  }

  // ===================== HEADER =====================

  private addHeader(doc: PDFKit.PDFDocument, sale: Sale): number {
    doc
      .fontSize(14)
      .fillColor(this.ACCENT_COLOR)
      .font('Helvetica-Bold')
      .text('HUERTAS', this.LEFT, 28);

    // Right side: contabilidad info
    const rightX = doc.page.width - this.RIGHT - 130;
    doc
      .fontSize(9)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica-Bold')
      .text('CONTABILIDAD', rightX, 25, { width: 130, align: 'right' });
    doc
      .fontSize(9)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text('N°: _____________', rightX, 40, { width: 130, align: 'right' })
      .text('Fecha: ___/___/___', rightX, 55, { width: 130, align: 'right' });

    // Title
    doc
      .fontSize(16)
      .fillColor(this.ACCENT_COLOR)
      .font('Helvetica-Bold')
      .text('HOJA DE RADICACIÓN DE VENTAS', this.LEFT, 80, {
        width: this.contentWidth,
        align: 'center',
      });

    doc.y = 105;
    return 105;
  }

  // ===================== SALE INFO =====================

  private addSaleInfoSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    startY: number,
  ): number {
    const rows = 4;
    const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Información de la Venta', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    // Row 1
    const saleDate = sale.createdAt
      ? sale.createdAt.toLocaleDateString('es-PE')
      : '';
    const clientName = sale.client?.lead
      ? `${sale.client.lead.firstName} ${sale.client.lead.lastName}`
      : '';
    this.drawField(doc, 'Fecha', saleDate, col1, y);
    this.drawField(doc, 'Cliente', clientName, col2, y);
    y += this.ROW_H;

    // Row 2
    const manzana = sale.lot?.block?.name || '';
    const lote =
      (sale.lot?.name || '') +
      ' ' +
      (sale.lot?.block?.stage?.project?.currency || '');
    this.drawField(doc, 'Manzana', manzana, col1, y);
    this.drawField(doc, 'Lote', lote, col2, y);
    y += this.ROW_H;

    // Row 3
    const currency = sale.lot?.block?.stage?.project?.currency || '';
    const reservationAmount = sale.reservationAmount
      ? `${sale.reservationAmount} ${currency}`
      : '';
    const initialAmount = sale.financing?.initialAmount
      ? `${sale.financing.initialAmount} ${currency}`
      : '';
    this.drawField(doc, 'Separación', reservationAmount, col1, y);
    this.drawField(doc, 'Cuota Inicial', initialAmount, col2, y);
    y += this.ROW_H;

    // Row 4: Total + checkboxes
    const totalAmount = sale.totalAmount
      ? `${sale.totalAmount} ${currency}`
      : '';
    this.drawField(doc, 'Total', totalAmount, col1, y);

    // Checkboxes for sale type
    const cbX = col2;
    const isCash = sale.type === SaleType.DIRECT_PAYMENT;
    const isFinanced = sale.type === SaleType.FINANCED;

    doc
      .fontSize(9)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text('Cash', cbX, y);
    this.drawCheckbox(doc, cbX + 30, y, isCash);

    doc
      .fontSize(9)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text('Financiamiento', cbX + 60, y);
    this.drawCheckbox(doc, cbX + 145, y, isFinanced);
    doc.y = y;

    return startY + cardH + this.GAP;
  }

  // ===================== URBAN DEVELOPMENT =====================

  private addUrbanDevelopmentSection(
    doc: PDFKit.PDFDocument,
    urbanDevelopment: RadicationPdfData['urbanDevelopment'],
    startY: number,
  ): number {
    const rows = 2;
    const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Habilitación Urbana', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    this.drawField(
      doc,
      'Monto HU',
      urbanDevelopment.financing.initialAmount?.toString() || '',
      col1,
      y,
    );
    this.drawField(
      doc,
      '#Cuotas',
      urbanDevelopment.financing.quantityCoutes?.toString() || '',
      col2,
      y,
    );
    y += this.ROW_H;

    this.drawField(doc, 'Valor Cuota', '—', col1, y);
    this.drawField(doc, 'Fecha Pago', '___/___/___', col2, y);

    return startY + cardH + this.GAP;
  }

  // ===================== PARTICIPANTS =====================

  private addParticipantsSection(
    doc: PDFKit.PDFDocument,
    sale: Sale,
    startY: number,
  ): number {
    const rows = 3;
    const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;
    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Participantes', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    // Row 1
    this.drawField(
      doc,
      'Jefe Ventas',
      this.getParticipantName(sale.fieldManager),
      col1,
      y,
    );
    this.drawField(
      doc,
      'Cierre',
      this.getParticipantName(sale.fieldSeller),
      col2,
      y,
    );
    y += this.ROW_H;

    // Row 2
    this.drawField(
      doc,
      'Línea',
      this.getParticipantName(sale.liner),
      col1,
      y,
    );
    this.drawField(
      doc,
      'Supervisor TLMK',
      this.getParticipantName(sale.telemarketingSupervisor),
      col2,
      y,
    );
    y += this.ROW_H;

    // Row 3
    this.drawField(
      doc,
      'Confirmador TLMK',
      this.getParticipantName(sale.telemarketingConfirmer),
      col1,
      y,
    );
    this.drawField(
      doc,
      'TLMK',
      this.getParticipantName(sale.telemarketer),
      col2,
      y,
    );

    return startY + cardH + this.GAP;
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

  // ===================== UTILITY HELPERS =====================

  private getParticipantName(participant?: {
    firstName: string;
    lastName: string;
  }): string {
    if (!participant) return '';
    const first = participant.firstName?.split(' ')[0] || '';
    const last = participant.lastName?.split(' ')[0] || '';
    return `${first} ${last}`.trim();
  }
}
