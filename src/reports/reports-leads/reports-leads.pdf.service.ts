import { Injectable, Logger } from '@nestjs/common';
import { LeadReportPdfData } from './interfaces/leads-response.interface';
import * as PDFDocument from 'pdfkit';
import { AwsS3Service } from 'src/files/aws-s3.service';
import { Lead } from 'src/lead/entities/lead.entity';

@Injectable()
export class ReportsLeadsPdfService {
  private readonly logger = new Logger(ReportsLeadsPdfService.name);
  constructor(private readonly awsS3Service: AwsS3Service) {}

  async generateLeadReportPdf(data: LeadReportPdfData): Promise<string> {
    try {
      const { lead, additionalInfo } = data;

      // Crear nuevo documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 10, left: 50, right: 50 },
      });

      // Buffer para almacenar el PDF
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

  private buildCompleteLeadReportPdf(
    doc: PDFKit.PDFDocument,
    data: LeadReportPdfData,
  ): void {
    const { lead, additionalInfo } = data;

    // Configuración de fuentes y colores
    const primaryColor = '#2c5234';
    const lightGreen = '#90c695';
    const darkGreen = '#2c5234';

    // Header reducido
    this.addCompactHeader(doc, darkGreen, lightGreen);

    // Título principal
    doc
      .fontSize(14)
      .fillColor('#000000')
      .text('BIENVENIDOS A HUERTAS INMOBILIARIA', 50, 90, { align: 'center' });

    // Subtítulo descriptivo
    doc
      .fontSize(9)
      .fillColor('#000000')
      .text(
        'Te invitamos a responder este breve formulario para brindarte un servicio cada vez más óptimo y',
        50,
        130,
      )
      .text(
        'personalizado. Porque tu comodidad y satisfacción son nuestra prioridad.',
        50,
        145,
      );

    let yPosition = 160;

    // Sección: Datos Personales
    yPosition = this.addPersonalDataSection(doc, lead, yPosition);

    // Sección: ¿Qué medio de transporte utiliza para llegar?
    yPosition = this.addTransportSection(doc, yPosition - 5);

    // Sección: Ingresos Familiares
    yPosition = this.addFamilyIncomeSection(doc, lead, yPosition - 5);

    // Sección: ¿Esta es su primera visita a Huertas Inmobiliaria?
    yPosition = this.addFirstVisitSection(doc, yPosition - 5);

    // Sección: Proyectos
    yPosition = this.addProjectsSection(doc, lead, yPosition - 5, lightGreen);

    // Sección: ¿Cómo se enteró de nuestro proyecto?
    yPosition = this.addHowDidYouHearSection(doc, yPosition);

    // Sección: Promedio de ingresos familiares
    yPosition = this.addOtherProjectInterestSection(doc, lead, yPosition);

    // Sección: ¿Es usuario de tarjetas de débito?
    yPosition = this.addDebitCardSection(doc, lead, yPosition);

    // Sección: ¿Es usuario de tarjetas de crédito?
    yPosition = this.addCreditCardSection(doc, lead, yPosition);

    // Sección: Acompañante y DNI
    yPosition = this.addCompanionSection(doc, lead, yPosition);

    // Sección: Acepto términos y condiciones
    yPosition = this.addTermsSection(doc, yPosition);

    // Sección: USO INTERNO TLMK (en cuadro) - más compacto
    yPosition = this.addInternalUseSection(doc, lead, yPosition);

    // NUEVO: Texto de consentimiento
    yPosition = this.addConsentText(doc, yPosition);

    // Espacio para firma - más compacto
    yPosition = this.addSignatureSection(doc, yPosition);

    // Footer real (información de contacto)
    this.addFooterAtFixedPosition(doc);
  }

  private addCompactHeader(
    doc: PDFKit.PDFDocument,
    darkGreen: string,
    lightGreen: string,
  ): void {
    // Header compacto de 70px
    doc.rect(0, 0, doc.page.width, 70).fillColor(lightGreen).fill();

    // Logo
    doc.rect(50, 15, 70, 40).fillColor(darkGreen).fill();

    doc
      .fontSize(10)
      .fillColor('#ffffff')
      .text('HUERTAS', 58, 25)
      .fontSize(7)
      .text('Inmobiliaria', 58, 38);

    // Fecha
    const currentDate = new Date().toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    doc
      .fontSize(9)
      .fillColor('#000000')
      .text(`Fecha: ${currentDate}`, doc.page.width - 120, 20);
  }

  private addPersonalDataSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc.fontSize(11).fillColor('#000000').text('Datos Personales:', 50, yPos);

    yPos += 20;

    // Nombre
    doc
      .fontSize(10)
      .text('Nombre:', 50, yPos)
      .text(`${lead.firstName} ${lead.lastName}`.toUpperCase(), 110, yPos);

    yPos += 18;

    // DNI y Ocupación
    doc
      .text('DNI:', 50, yPos)
      .text(lead.document, 90, yPos)
      .text('Ocupación:', 300, yPos);
    this.drawUnderline(doc, 360, yPos + 10, 120);

    yPos += 18;

    // Edad y Celular
    doc.text('Edad:', 50, yPos);
    if (lead.age) {
      doc.text(lead.age.toString(), 90, yPos);
    } else {
      this.drawUnderline(doc, 90, yPos + 10, 40);
    }

    doc.text('Celular:', 300, yPos).text(lead.phone || '', 350, yPos);
    if (!lead.phone) {
      this.drawUnderline(doc, 350, yPos + 10, 130);
    }

    yPos += 18;

    // Estado Civil - ACTUALIZADO con datos reales
    doc.text('Estado Civil:', 50, yPos);

    const estadoCivil = lead.metadata?.['estadoCivil'] || '';

    this.drawCheckbox(doc, 130, yPos - 2, estadoCivil === 'Casado');
    doc.text('Casado(a)', 145, yPos);

    this.drawCheckbox(doc, 210, yPos - 2, estadoCivil === 'Conviviente');
    doc.text('Conviviente', 225, yPos);

    this.drawCheckbox(doc, 290, yPos - 2, estadoCivil === 'Soltero');
    doc.text('Soltero(a)', 305, yPos);

    this.drawCheckbox(doc, 370, yPos - 2, estadoCivil === 'Divorciado');
    doc.text('Divorciado(a)', 385, yPos);

    yPos += 18;

    // Hijos - ACTUALIZADO con datos reales
    doc.text('Hijos:', 50, yPos);

    const cantidadHijos = lead.metadata?.['cantidadHijos'];
    const tieneHijos = cantidadHijos && cantidadHijos > 0;

    doc.text('Si', 90, yPos);
    this.drawCheckbox(doc, 105, yPos - 2, tieneHijos);
    doc.text('¿Cuántos?', 130, yPos);

    if (tieneHijos) {
      doc.text(cantidadHijos.toString(), 185, yPos);
    } else {
      this.drawUnderline(doc, 180, yPos + 10, 50);
    }

    doc.text('No', 250, yPos);
    this.drawCheckbox(doc, 270, yPos - 2, !tieneHijos);
    doc.text('¿En qué distrito reside?', 320, yPos);

    return yPos + 25;
  }

  private addTransportSection(doc: PDFKit.PDFDocument, startY: number): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Qué medio de transporte utiliza para llegar?', 50, yPos);

    yPos += 15;

    // Opciones de transporte
    doc.text('Auto propio', 50, yPos);
    this.drawCheckbox(doc, 110, yPos - 2, false);

    doc.text('Transporte público', 150, yPos);
    this.drawCheckbox(doc, 240, yPos - 2, false);

    doc.text('Taxi', 280, yPos);
    this.drawCheckbox(doc, 305, yPos - 2, false);

    doc.text('Otros', 340, yPos);
    this.drawCheckbox(doc, 370, yPos - 2, false);

    return yPos + 25;
  }

  private addFamilyIncomeSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('Ingresos Familiares:', 50, yPos);

    // ACTUALIZADO - Mostrar ingreso real si existe
    const ingresoPromedio = lead.metadata?.['Ingreso promedio'];
    if (ingresoPromedio) {
      doc.text(`S/ ${ingresoPromedio}`, 155, yPos);
    } else {
      this.drawUnderline(doc, 150, yPos + 10, 200);
    }

    return yPos + 25;
  }

  private addFirstVisitSection(
    doc: PDFKit.PDFDocument,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Esta es su primera visita a Huertas Inmobiliaria?', 50, yPos);

    // Por ahora dejamos sin marcar, pero podrías agregar este campo al lead si es necesario
    doc.text('Si', 300, yPos);
    this.drawCheckbox(doc, 315, yPos - 2, false);

    doc.text('No', 340, yPos);
    this.drawCheckbox(doc, 355, yPos - 2, false);

    return yPos + 25;
  }

  private addProjectsSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
    lightGreen: string,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Por cuál de nuestros proyectos ha venido?', 50, yPos);

    yPos += 20;

    // ACTUALIZADO - Marcar proyectos de interés reales
    const interestProjects = lead.interestProjects || [];

    // Primera fila: EL OLIVAR y OASIS
    const projects1 = [
      { name: 'EL OLIVAR', checked: interestProjects.includes('EL OLIVAR') },
      { name: 'OASIS', checked: interestProjects.includes('OASIS') },
    ];

    projects1.forEach((project, index) => {
      const xPos = 80 + index * 250;

      doc
        .rect(xPos, yPos, 70, 20)
        .fillColor(lightGreen)
        .fill()
        .fontSize(9)
        .fillColor('#000000')
        .text(project.name, xPos + 8, yPos + 6);

      this.drawCheckbox(doc, xPos + 80, yPos + 3, project.checked);
    });

    yPos += 30;

    // Segunda fila: APOLO y MAREA
    const projects2 = [
      {
        name: 'APOLO',
        checked:
          interestProjects.includes('Apolo') ||
          interestProjects.includes('APOLO'),
      },
      { name: 'MAREA', checked: interestProjects.includes('MAREA') },
    ];

    projects2.forEach((project, index) => {
      const xPos = 80 + index * 250;

      doc
        .rect(xPos, yPos, 70, 20)
        .fillColor(lightGreen)
        .fill()
        .fontSize(9)
        .fillColor('#000000')
        .text(project.name, xPos + 8, yPos + 6);

      this.drawCheckbox(doc, xPos + 80, yPos + 3, project.checked);
    });

    return yPos + 35;
  }

  private addHowDidYouHearSection(
    doc: PDFKit.PDFDocument,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Cómo se enteró de nuestro proyecto?', 50, yPos);

    yPos += 15;

    // Una sola fila de opciones
    doc.text('Facebook', 50, yPos);
    this.drawCheckbox(doc, 100, yPos - 2, false);

    doc.text('Instagram', 140, yPos);
    this.drawCheckbox(doc, 190, yPos - 2, false);

    doc.text('Tik Tok', 230, yPos);
    this.drawCheckbox(doc, 270, yPos - 2, false);

    doc.text('Web Huertas', 310, yPos);
    this.drawCheckbox(doc, 370, yPos - 2, false);

    doc.text('Otros:', 410, yPos);
    this.drawUnderline(doc, 440, yPos + 10, 80);

    return yPos + 25;
  }

  private addOtherProjectInterestSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text(
        'Por estadísticas, cual es el promedio de ingresos familiares?',
        50,
        yPos,
      );

    // Mostrar el valor del ingreso promedio desde metadata
    const ingresoPromedio = lead.metadata?.['Ingreso promedio'];
    if (ingresoPromedio) {
      doc.text(`S/ ${ingresoPromedio}`, 350, yPos);
    } else {
      this.drawUnderline(doc, 350, yPos + 10, 150);
    }

    return yPos + 20;
  }

  private addDebitCardSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Es usuario de tarjetas de débito?', 50, yPos);

    // ACTUALIZADO - Mostrar cantidad real de tarjetas de débito
    const cantidadTarjetasDebito = lead.metadata?.['cantidadTarjetasDebito'];
    const tieneTarjetasDebito =
      cantidadTarjetasDebito && cantidadTarjetasDebito > 0;

    doc.text('Si', 250, yPos);
    this.drawCheckbox(doc, 265, yPos - 2, tieneTarjetasDebito);

    doc.text('¿Cuántas?', 290, yPos);
    if (tieneTarjetasDebito) {
      doc.text(cantidadTarjetasDebito.toString(), 345, yPos);
    } else {
      this.drawUnderline(doc, 340, yPos + 10, 60);
    }

    doc.text('No', 420, yPos);
    this.drawCheckbox(doc, 435, yPos - 2, !tieneTarjetasDebito);

    return yPos + 20;
  }

  private addCreditCardSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('¿Es usuario de tarjetas de crédito?', 50, yPos);

    // ACTUALIZADO - Mostrar cantidad real de tarjetas de crédito
    const cantidadTarjetasCredito = lead.metadata?.['cantidadTarjetasCredito'];
    const tieneTarjetasCredito =
      cantidadTarjetasCredito && cantidadTarjetasCredito > 0;

    doc.text('Si', 250, yPos);
    this.drawCheckbox(doc, 265, yPos - 2, tieneTarjetasCredito);

    doc.text('¿Cuántas?', 290, yPos);
    if (tieneTarjetasCredito) {
      doc.text(cantidadTarjetasCredito.toString(), 345, yPos);
    } else {
      this.drawUnderline(doc, 340, yPos + 10, 60);
    }

    doc.text('No', 420, yPos);
    this.drawCheckbox(doc, 435, yPos - 2, !tieneTarjetasCredito);

    return yPos + 20;
  }

  private addCompanionSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    doc.fontSize(10).fillColor('#000000').text('Acompañante:', 50, yPos);

    // ACTUALIZADO - Mostrar nombre del acompañante real
    const companionName = lead.companionFullName;
    if (companionName) {
      doc.text(companionName, 125, yPos);
    } else {
      this.drawUnderline(doc, 120, yPos + 10, 200);
    }

    doc.text('DNI:', 350, yPos);

    // ACTUALIZADO - Mostrar DNI del acompañante real
    const companionDni = lead.companionDni;
    if (companionDni) {
      doc.text(companionDni, 385, yPos);
    } else {
      this.drawUnderline(doc, 380, yPos + 10, 150);
    }

    return yPos + 20;
  }

  private addTermsSection(doc: PDFKit.PDFDocument, startY: number): number {
    let yPos = startY;

    doc
      .fontSize(10)
      .fillColor('#000000')
      .text('Acepto términos y condiciones de esta invitación.', 50, yPos);

    this.drawCheckbox(doc, 280, yPos - 2, false);

    return yPos + 15;
  }

  // NUEVA FUNCIÓN: Texto de consentimiento
  private addConsentText(doc: PDFKit.PDFDocument, startY: number): number {
    let yPos = startY;

    const consentText = `Otorgo mi consentimiento a Inmobiliaria Huertas Grupo Inv. S.R.L. y sus empresas vinculadas domiciliadas en Calle Luis Espejo 1097 Oficina 803 Santa Catalina - La Victoria para recopilar, almacenar y tratar mis datos personales. La recopilación, organización y tratamiento de mis datos personales tiene como finalidad ofrecer productos y servicios a través de SMS, correo electrónico, teléfono, Whatsapp. Mis datos personales serán conservados bajo las medidas de seguridad establecidas por Inmobiliaria Huertas Grupo Inv. S.R.L. y sus empresas vinculadas. Puedo revocar mi consentimiento en cualquier momento. En tal sentido, podré ejercer mis derechos de acceso, rectificación, cancelación y oposición a través del correo electrónico ventas@inmobiliariahuertas.com.`;

    doc
      .fontSize(7)
      .fillColor('#000000')
      .text(consentText, 50, yPos, {
        width: doc.page.width - 100,
        align: 'justify',
        lineGap: 1,
      });

    return yPos + 80;
  }

  private addInternalUseSection(
    doc: PDFKit.PDFDocument,
    lead: Lead,
    startY: number,
  ): number {
    let yPos = startY;

    // Título centrado
    doc
      .fontSize(9)
      .fillColor('#666666')
      .text('USO INTERNO TLMK', 50, yPos, { align: 'center' });

    yPos += 10;

    // Cuadro
    const boxX = 80;
    const boxY = yPos;
    const boxWidth = doc.page.width - 160;
    const boxHeight = 70;

    doc.rect(boxX, boxY, boxWidth, boxHeight).stroke('#000000');

    yPos += 10;

    doc.fontSize(7).fillColor('#000000');

    // PRIMERA LÍNEA: L: ___ Jefatura: ___ Supervisor: ___
    doc.text('L:', boxX + 10, yPos);
    // Mostrar liner si existe
    const linerName = lead.liner
      ? `${lead.liner.firstName.split(' ')[0]} ${lead.liner.lastName.split(' ')[0]}`
      : '';
    if (linerName) {
      doc.text(linerName, boxX + 20, yPos);
    } else {
      this.drawUnderline(doc, boxX + 20, yPos + 8, 95);
    }

    doc.text('Jefatura:', boxX + 130, yPos);
    // Mostrar fieldManager si existe
    const fieldManager = lead.fieldManager
      ? `${lead.fieldManager.firstName.split(' ')[0]} ${lead.fieldManager.lastName.split(' ')[0]}`
      : '';
    if (fieldManager) {
      doc.text(fieldManager, boxX + 165, yPos);
    } else {
      this.drawUnderline(doc, boxX + 165, yPos + 8, 95);
    }

    doc.text('Supervisor:', boxX + 275, yPos);
    // Mostrar telemarketingSupervisor si existe
    const supervisor = lead.telemarketingSupervisor
      ? `${lead.telemarketingSupervisor.firstName.split(' ')[0]} ${lead.telemarketingSupervisor.lastName.split(' ')[0]}`
      : '';
    if (supervisor) {
      doc.text(supervisor, boxX + 320, yPos);
    } else {
      this.drawUnderline(doc, boxX + 320, yPos + 8, 95);
    }

    yPos += 15;

    // SEGUNDA LÍNEA: C: ___ Confirmador: ___ TLMK: ___
    doc.text('C:', boxX + 10, yPos);
    // Mostrar vendor/fieldSeller si existe
    const vendor = lead.fieldSeller
      ? `${lead.vendor.firstName.split(' ')[0]} ${lead.vendor.lastName.split(' ')[0]}`
      : '';
    if (vendor) {
      doc.text(vendor, boxX + 20, yPos);
    } else {
      this.drawUnderline(doc, boxX + 20, yPos + 8, 95);
    }

    doc.text('Confirmador:', boxX + 130, yPos);
    // Mostrar telemarketingConfirmer si existe
    const confirmer = lead.telemarketingConfirmer
      ? `${lead.telemarketingConfirmer.firstName.split(' ')[0]} ${lead.telemarketingConfirmer.lastName.split(' ')[0]}`
      : '';
    if (confirmer) {
      doc.text(confirmer, boxX + 185, yPos);
    } else {
      this.drawUnderline(doc, boxX + 185, yPos + 8, 75);
    }

    doc.text('TLMK:', boxX + 275, yPos);
    // Mostrar telemarketer si existe
    const telemarketer = lead.telemarketer
      ? `${lead.telemarketer.firstName.split(' ')[0]} ${lead.telemarketer.lastName.split(' ')[0]}`
      : '';
    if (telemarketer) {
      doc.text(telemarketer, boxX + 305, yPos);
    } else {
      this.drawUnderline(doc, boxX + 305, yPos + 8, 110);
    }

    yPos += 15;

    doc.text('Deal', boxX + 10, yPos);
    doc.text('PROC', boxX + 35, yPos);
    doc.text('PEN', boxX + 65, yPos);
    doc.text('RES', boxX + 90, yPos);

    doc.text('Hora de ingreso:', boxX + 130, yPos);
    this.drawUnderline(doc, boxX + 185, yPos + 8, 85);

    doc.text('Hora de salida:', boxX + 275, yPos);
    this.drawUnderline(doc, boxX + 330, yPos + 8, 85);

    yPos += 15;

    // CUARTA LÍNEA: Obs. ________________________
    doc.text('Obs.', boxX + 10, yPos);
    this.drawUnderline(doc, boxX + 30, yPos + 8, 385);

    return yPos + 20;
  }

  private addSignatureSection(doc: PDFKit.PDFDocument, startY: number): number {
    let yPos = startY + 10;

    // Calcular posición centrada para la sección completa
    const centerX = doc.page.width / 2;
    const lineWidth = 200;

    // Texto "Firma:" al lado izquierdo de la línea
    doc
      .fontSize(11)
      .fillColor('#000000')
      .text('Firma:', centerX - lineWidth / 2 - 50, yPos);

    // Línea para firma
    this.drawUnderline(doc, centerX - lineWidth / 2, yPos + 2, lineWidth);

    return yPos + 25;
  }

  private addFooterAtFixedPosition(doc: PDFKit.PDFDocument): void {
    // Posición fija del footer
    const footerY = doc.page.height - 60;

    // Información de contacto en una sola línea centrada
    doc
      .fontSize(8)
      .fillColor('#000000')
      .text(
        '984 403 259      Calle Luis Espejo 1097 Of. 803 - La Victoria      ventas@inmobiliariahuertas.com',
        50,
        footerY + 12,
        { align: 'center' },
      );
  }

  // Métodos helper
  private drawCheckbox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    checked: boolean,
  ): void {
    const size = 12;

    doc.rect(x, y, size, size).stroke('#000000');

    if (checked) {
      doc
        .save()
        .strokeColor('#000000')
        .lineWidth(1.5)
        .moveTo(x + 2, y + 6)
        .lineTo(x + 5, y + 9)
        .lineTo(x + 10, y + 3)
        .stroke()
        .restore();
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
      .strokeColor('#000000')
      .lineWidth(0.5)
      .moveTo(x, y)
      .lineTo(x + width, y)
      .stroke()
      .restore();
  }
}
