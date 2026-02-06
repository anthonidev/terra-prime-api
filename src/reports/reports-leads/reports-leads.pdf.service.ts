import { Injectable, Logger } from '@nestjs/common';
import { LeadReportPdfData } from './interfaces/leads-response.interface';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Lead } from 'src/lead/entities/lead.entity';
import { LeadVisit } from 'src/lead/entities/lead-visit.entity';

@Injectable()
export class ReportsLeadsPdfService {
  private readonly logger = new Logger(ReportsLeadsPdfService.name);

  private readonly ACCENT_COLOR = '#2c5234';
  private readonly ACCENT_LIGHT = '#e8f0ea';
  private readonly TEXT_PRIMARY = '#1a1a1a';
  private readonly TEXT_SECONDARY = '#555555';
  private readonly TEXT_MUTED = '#666666';
  private readonly BORDER_COLOR = '#d0d0d0';
  private readonly PAGE_BG = '#f3f4f6';
  private readonly CARD_BG = '#ffffff';
  private readonly CARD_BORDER = '#e2e4e8';
  private readonly LEFT = 50;
  private readonly RIGHT = 50;
  private readonly ROW_H = 20;
  private readonly GAP = 8;
  private readonly CARD_PAD = 10;
  private readonly CARD_RADIUS = 8;

  constructor(private readonly awsS3Service: AwsS3Service) {}

  async generateLeadReportPdf(data: LeadReportPdfData): Promise<string> {
    try {
      const { lead } = data;

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
            const fileName = `lead-report-${lead.id}-${Date.now()}.pdf`;
            const s3Url = await this.awsS3Service.uploadPdfFromBuffer(
              pdfBuffer,
              fileName,
              'documents',
            );
            resolve(s3Url);
          } catch (error) {
            this.logger.error('Error uploading PDF to S3:', error);
            reject(error);
          }
        });

        doc.on('error', reject);

        try {
          this.buildCompleteLeadReportPdf(doc, data);
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

  private get contentWidth(): number {
    return 595.28 - this.LEFT - this.RIGHT;
  }

  private buildCompleteLeadReportPdf(
    doc: PDFKit.PDFDocument,
    data: LeadReportPdfData,
  ): void {
    const { lead, leadVisit } = data;

    // Fondo de página completo
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fillColor(this.PAGE_BG)
      .fill();

    let y = this.addHeader(doc);
    y = this.addPersonalDataSection(doc, lead, y);
    y = this.addProjectSection(doc, lead, y);
    y = this.addFinancialSection(doc, lead, y);
    y = this.addSourceSection(doc, lead, y);
    y = this.addTermsAndConsentSection(doc, y);
    this.addInternalUseSection(doc, leadVisit, y);

    this.addFooter(doc);
  }

  // ===================== CARD HELPER =====================

  private drawCard(doc: PDFKit.PDFDocument, y: number, height: number): void {
    const x = this.LEFT - 4;
    const w = this.contentWidth + 8;

    // Sombra sutil
    doc
      .roundedRect(x + 1, y + 1, w, height, this.CARD_RADIUS)
      .fillColor('#dcdee2')
      .fill();

    // Fondo blanco
    doc
      .roundedRect(x, y, w, height, this.CARD_RADIUS)
      .fillColor(this.CARD_BG)
      .fill();

    // Borde
    doc
      .roundedRect(x, y, w, height, this.CARD_RADIUS)
      .strokeColor(this.CARD_BORDER)
      .lineWidth(0.5)
      .stroke();
  }

  // ===================== HEADER =====================

  private addHeader(doc: PDFKit.PDFDocument): number {
    const logoPath = path.join(__dirname, 'img', 'logo.png');

    try {
      doc.image(logoPath, this.LEFT, 18, { height: 45 });
    } catch {
      this.logger.warn('Logo not found, using text fallback');
      doc
        .fontSize(14)
        .fillColor(this.ACCENT_COLOR)
        .font('Helvetica-Bold')
        .text('HUERTAS', this.LEFT, 28);
    }

    const currentDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    doc
      .fontSize(10)
      .fillColor(this.TEXT_MUTED)
      .font('Helvetica')
      .text(currentDate, doc.page.width - this.RIGHT - 90, 28, {
        width: 90,
        align: 'right',
      });

    doc
      .fontSize(18)
      .fillColor(this.ACCENT_COLOR)
      .font('Helvetica-Bold')
      .text('Bienvenido', this.LEFT, 70, {
        width: this.contentWidth,
        align: 'center',
      });

    doc.y = 95;
    return 95;
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

  // ===================== PERSONAL DATA + COMPANION =====================

  private addPersonalDataSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    const hasCompanion = !!(lead.companionFullName || lead.companionDni);
    const rows = hasCompanion ? 5 : 4;
    const cardH = this.CARD_PAD + 20 + rows * this.ROW_H + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Datos Personales', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    this.drawField(
      doc,
      'Nombre',
      `${lead.firstName} ${lead.lastName}`.toUpperCase(),
      col1,
      y,
    );
    this.drawField(doc, 'DNI', lead.document || '', col2, y);
    y += this.ROW_H;

    this.drawField(doc, 'Edad', lead.age ? `${lead.age} años` : '', col1, y);
    this.drawField(doc, 'Celular', lead.phone || '', col2, y);
    y += this.ROW_H;

    const ocupacion = lead.metadata?.ocupacion || '';
    const estadoCivil = lead.metadata?.estadoCivil || '';
    this.drawField(doc, 'Ocupación', ocupacion, col1, y);
    this.drawField(doc, 'Estado Civil', estadoCivil, col2, y);
    y += this.ROW_H;

    const cantidadHijos = lead.metadata?.cantidadHijos;
    const hijosText =
      cantidadHijos && cantidadHijos > 0 ? `Sí (${cantidadHijos})` : 'No';
    const distrito = lead.ubigeo?.name || '';
    this.drawField(doc, 'Hijos', hijosText, col1, y);
    this.drawField(doc, 'Distrito', distrito, col2, y);
    y += this.ROW_H;

    if (hasCompanion) {
      this.drawField(doc, 'Acompañante', lead.companionFullName || '', col1, y);
      this.drawField(doc, 'DNI Acompañante', lead.companionDni || '', col2, y);
      y += this.ROW_H;
    }

    return startY + cardH + this.GAP;
  }

  // ===================== PROJECT =====================

  private addProjectSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    const hasPills = (lead.interestProjects || []).length > 0;
    const contentH = hasPills ? 26 : this.ROW_H;
    const cardH = this.CARD_PAD + 20 + contentH + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Proyecto de Interés', y);

    const projects = lead.interestProjects || [];

    if (projects.length > 0) {
      let x = this.LEFT + 12;
      for (const project of projects) {
        const tw = doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .widthOfString(project);
        const pillW = tw + 16;
        const pillH = 20;

        doc
          .roundedRect(x, y, pillW, pillH, 4)
          .fillColor(this.ACCENT_LIGHT)
          .fill();
        doc
          .fontSize(10)
          .fillColor(this.ACCENT_COLOR)
          .font('Helvetica-Bold')
          .text(project, x + 8, y + 5);
        doc.y = y;

        x += pillW + 8;
      }
    } else {
      doc
        .fontSize(10)
        .fillColor(this.TEXT_MUTED)
        .font('Helvetica')
        .text('—', this.LEFT + 12, y);
      doc.y = y;
    }

    return startY + cardH + this.GAP;
  }

  // ===================== FINANCIAL =====================

  private addFinancialSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    const cardH = this.CARD_PAD + 20 + 2 * this.ROW_H + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Información Financiera', y);

    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + this.contentWidth / 2;

    const ingreso = lead.metadata?.ingresoPromedioFamiliar;
    this.drawField(
      doc,
      'Ingreso promedio familiar',
      ingreso ? `S/ ${ingreso}` : '',
      col1,
      y,
    );
    y += this.ROW_H;

    const tieneTarjetasDebito = lead.metadata?.tieneTarjetasDebito;
    const cantidadDebito = lead.metadata?.cantidadTarjetasDebito;
    let debitoText = '—';
    if (tieneTarjetasDebito === true) {
      debitoText = cantidadDebito ? `Sí (${cantidadDebito})` : 'Sí';
    } else if (tieneTarjetasDebito === false) {
      debitoText = 'No';
    }

    const tieneTarjetasCredito = lead.metadata?.tieneTarjetasCredito;
    const cantidadCredito = lead.metadata?.cantidadTarjetasCredito;
    let creditoText = '—';
    if (tieneTarjetasCredito === true) {
      creditoText = cantidadCredito ? `Sí (${cantidadCredito})` : 'Sí';
    } else if (tieneTarjetasCredito === false) {
      creditoText = 'No';
    }

    this.drawField(doc, 'Tarjetas de débito', debitoText, col1, y);
    this.drawField(doc, 'Tarjetas de crédito', creditoText, col2, y);

    return startY + cardH + this.GAP;
  }

  // ===================== SOURCE =====================

  private addSourceSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    const cardH = this.CARD_PAD + 20 + this.ROW_H + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Fuente de Contacto', y);

    this.drawField(
      doc,
      '¿Cómo se enteró?',
      lead.source?.name || '',
      this.LEFT + 12,
      y,
    );

    return startY + cardH + this.GAP;
  }

  // ===================== TERMS & CONSENT =====================

  private addTermsAndConsentSection(
    doc: PDFKit.PDFDocument,
    startY: number,
  ): number {
    // Pre-calcular altura del bloque de consentimiento
    const consentText =
      'Otorgo mi consentimiento a Inmobiliaria Huertas Grupo Inv. S.R.L. y sus empresas vinculadas domiciliadas en Calle Luis Espejo 1097 Oficina 803 Santa Catalina - La Victoria para recopilar, almacenar y tratar mis datos personales. La recopilación, organización y tratamiento de mis datos personales tiene como finalidad ofrecer productos y servicios a través de SMS, correo electrónico, teléfono, Whatsapp. Mis datos personales serán conservados bajo las medidas de seguridad establecidas por Inmobiliaria Huertas Grupo Inv. S.R.L. y sus empresas vinculadas. Puedo revocar mi consentimiento en cualquier momento. En tal sentido, podré ejercer mis derechos de acceso, rectificación, cancelación y oposición a través del correo electrónico ventas@inmobiliariahuertas.com.';

    const textOpts = {
      width: this.contentWidth - 40,
      align: 'justify' as const,
      lineGap: 0,
    };
    const consentBlockH =
      doc.fontSize(7).font('Helvetica').heightOfString(consentText, textOpts) +
      8;

    // title(20) + checkbox(20) + consentBlock + gap(4) + firma(20)
    const cardH =
      this.CARD_PAD + 20 + this.ROW_H + consentBlockH + 4 + 20 + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Términos y Consentimiento', y);

    this.drawCheckbox(doc, this.LEFT + 12, y, true);
    doc
      .fontSize(10)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica')
      .text(
        'Acepto términos y condiciones de esta invitación.',
        this.LEFT + 28,
        y,
      );
    doc.y = y + this.ROW_H;
    y += this.ROW_H;

    // Bloque de consentimiento con fondo interno
    doc
      .roundedRect(
        this.LEFT + 6,
        y - 4,
        this.contentWidth - 12,
        consentBlockH,
        4,
      )
      .fillColor('#f7f7f7')
      .fill();

    doc
      .fontSize(7)
      .fillColor(this.TEXT_SECONDARY)
      .font('Helvetica')
      .text(consentText, this.LEFT + 14, y, textOpts);
    y += consentBlockH + 4;
    doc.y = y;

    doc
      .fontSize(10)
      .fillColor(this.TEXT_PRIMARY)
      .font('Helvetica')
      .text('Firma:', this.LEFT + 12, y);
    this.drawUnderline(doc, this.LEFT + 55, y + 12, 200);
    y += 20;
    doc.y = y;

    return startY + cardH + this.GAP;
  }

  // ===================== INTERNAL USE =====================

  private addInternalUseSection(
    doc: PDFKit.PDFDocument,
    leadVisit: LeadVisit,
    startY: number,
  ): number {
    const cardH = this.CARD_PAD + 20 + 4 * this.ROW_H + this.CARD_PAD;

    this.drawCard(doc, startY, cardH);

    let y = startY + this.CARD_PAD;
    y = this.drawSectionTitle(doc, 'Uso Interno', y);

    const cw = this.contentWidth;
    const col1 = this.LEFT + 12;
    const col2 = this.LEFT + cw / 3;
    const col3 = this.LEFT + (cw * 2) / 3;

    this.drawField(
      doc,
      'L',
      this.getParticipantShortName(leadVisit.linerParticipant),
      col1,
      y,
    );
    this.drawField(
      doc,
      'Jefatura',
      this.getParticipantShortName(leadVisit.fieldManager),
      col2,
      y,
    );
    this.drawField(
      doc,
      'Supervisor',
      this.getParticipantShortName(leadVisit.telemarketingSupervisor),
      col3,
      y,
    );
    y += this.ROW_H;

    this.drawField(
      doc,
      'C',
      this.getParticipantShortName(leadVisit.fieldSeller),
      col1,
      y,
    );
    this.drawField(
      doc,
      'Confirmador',
      this.getParticipantShortName(leadVisit.telemarketingConfirmer),
      col2,
      y,
    );
    this.drawField(
      doc,
      'TLMK',
      this.getParticipantShortName(leadVisit.telemarketer),
      col3,
      y,
    );
    y += this.ROW_H;

    const horaIngreso = leadVisit.arrivalTime
      ? new Date(leadVisit.arrivalTime).toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const horaSalida = leadVisit.departureTime
      ? new Date(leadVisit.departureTime).toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    this.drawField(doc, 'Hora ingreso', horaIngreso, col1, y);
    this.drawField(doc, 'Hora salida', horaSalida, col2, y);
    y += this.ROW_H;

    this.drawField(doc, 'Obs', leadVisit.observations || '', col1, y);
    y += this.ROW_H;

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

  private getParticipantShortName(participant?: {
    firstName: string;
    lastName: string;
  }): string {
    if (!participant) return '';
    const first = participant.firstName?.split(' ')[0] || '';
    const last = participant.lastName?.split(' ')[0] || '';
    return `${first} ${last}`.trim();
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
      doc.roundedRect(x, y, size, size, 2).stroke(this.BORDER_COLOR);
    }
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
}
