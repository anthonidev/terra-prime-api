import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { NubefactAdapter } from 'src/common/adapters/nubefact.adapter';
import { NubefactInvoiceDto } from './dto/nubefact-invoice.dto';
import { NubefactInvoiceItemDto } from './dto/nubefact-invoice-item.dto';
import { NubefactResponseDto } from './dto/nubefact-response.dto';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly nubefactAdapter: NubefactAdapter,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: User): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      fullNumber: `${createInvoiceDto.series}-${createInvoiceDto.number}`,
      createdBy: user,
      status: InvoiceStatus.DRAFT,
    });

    const items = createInvoiceDto.items.map((itemDto) => {
      const item = this.invoiceItemRepository.create(itemDto);
      this.calculateItemTotals(item);
      return item;
    });

    invoice.items = items;
    this.calculateInvoiceTotals(invoice);

    return await this.invoiceRepository.save(invoice);
  }

  async sendToSunat(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items', 'relatedInvoice'],
    });

    if (!invoice)
      throw new NotFoundException('Factura no encontrada');

    const nubefactDto = this.mapToNubefactDto(invoice);
    const response = await this.nubefactAdapter.post<NubefactResponseDto>(
      '',
      nubefactDto,
    );

    invoice.status = InvoiceStatus.SENT;
    invoice.sunatAccepted = response.aceptada_por_sunat;
    invoice.sunatDescription = response.sunat_description;
    invoice.sunatNote = response.sunat_note;
    invoice.sunatResponseCode = response.sunat_responsecode;
    invoice.sunatSoapError = response.sunat_soap_error;
    invoice.pdfUrl = response.enlace_del_pdf;
    invoice.xmlUrl = response.enlace_del_xml;
    invoice.cdrUrl = response.enlace_del_cdr;

    if (response.aceptada_por_sunat === '1' || response.aceptada_por_sunat === 'true') {
      invoice.status = InvoiceStatus.ACCEPTED;
    } else {
      invoice.status = InvoiceStatus.REJECTED;
    }

    return await this.invoiceRepository.save(invoice);
  }

  async findAll(): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      relations: ['items', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'createdBy', 'relatedInvoice'],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return invoice;
  }

  private mapToNubefactDto(invoice: Invoice): NubefactInvoiceDto {
    const nubefactItems: NubefactInvoiceItemDto[] = invoice.items.map((item) => ({
      unidad_de_medida: item.unitOfMeasure,
      codigo: item.code,
      descripcion: item.description,
      cantidad: item.quantity,
      valor_unitario: item.unitValue,
      precio_unitario: item.unitPrice,
      descuento: item.discount,
      subtotal: item.subtotal,
      tipo_de_igv: item.igvType,
      igv: item.igv,
      total: item.total,
    }));

    // Generar fecha de emisión en formato DD-MM-AAAA (zona horaria de Lima)
    const now = new Date();
    const limaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    const day = String(limaDate.getDate()).padStart(2, '0');
    const month = String(limaDate.getMonth() + 1).padStart(2, '0');
    const year = limaDate.getFullYear();
    const fechaEmision = `${day}-${month}-${year}`;

    const nubefactDto: NubefactInvoiceDto = {
      operacion: 'generar_comprobante',
      tipo_de_comprobante: invoice.documentType,
      serie: invoice.series,
      numero: invoice.number,
      sunat_transaction: invoice.sunatTransaction,
      cliente_tipo_de_documento: invoice.clientDocumentType,
      cliente_numero_de_documento: invoice.clientDocumentNumber,
      cliente_denominacion: invoice.clientName,
      cliente_direccion: invoice.clientAddress,
      cliente_email: invoice.clientEmail,
      fecha_de_emision: fechaEmision,
      moneda: invoice.currency,
      tipo_de_cambio: invoice.exchangeRate,
      porcentaje_de_igv: invoice.igvPercentage,
      total_gravada: invoice.totalTaxed,
      total_inafecta: invoice.totalUnaffected,
      total_exonerada: invoice.totalExonerated,
      total_gratuita: invoice.totalFree,
      total_descuentos: invoice.totalDiscounts,
      total_igv: invoice.totalIgv,
      total: invoice.total,
      enviar_automaticamente_a_la_sunat: invoice.sendAutomaticallyToSunat,
      enviar_automaticamente_al_cliente: invoice.sendAutomaticallyToClient,
      codigo_unico: invoice.uniqueCode,
      formato_de_pdf: invoice.pdfFormat,
      observaciones: invoice.observations,
      items: nubefactItems,
    };

    if (invoice.relatedInvoice) {
      nubefactDto.codigo_tipo_nota = invoice.noteReasonCode;
      nubefactDto.motivo_nota = invoice.noteReasonDescription;
      nubefactDto.comprobante_afectado_serie = invoice.relatedInvoice.series;
      nubefactDto.comprobante_afectado_numero = invoice.relatedInvoice.number;
    }

    return nubefactDto;
  }

  private calculateItemTotals(item: InvoiceItem): void {
    const subtotalBeforeDiscount = item.quantity * item.unitValue;
    const discountAmount = subtotalBeforeDiscount * (item.discount || 0) / 100;
    item.subtotal = subtotalBeforeDiscount - discountAmount;

    const igvPercentage = this.getIgvPercentageByType(item.igvType);
    item.igv = item.subtotal * igvPercentage / 100;
    item.total = item.subtotal + item.igv;
    item.unitPrice = item.total / item.quantity;
  }

  private calculateInvoiceTotals(invoice: Invoice): void {
    let totalTaxed = 0;
    let totalUnaffected = 0;
    let totalExonerated = 0;
    let totalFree = 0;
    let totalIgv = 0;
    let totalDiscounts = 0;

    invoice.items.forEach((item) => {
      totalIgv += item.igv;
      totalDiscounts += (item.quantity * item.unitValue * (item.discount || 0)) / 100;

      if (item.igvType === 1) {
        totalTaxed += item.subtotal;
      } else if ([13, 14, 15, 16, 17, 18].includes(item.igvType)) {
        totalUnaffected += item.subtotal;
      } else if ([11, 12].includes(item.igvType)) {
        totalExonerated += item.subtotal;
      }
    });

    invoice.totalTaxed = totalTaxed;
    invoice.totalUnaffected = totalUnaffected;
    invoice.totalExonerated = totalExonerated;
    invoice.totalFree = totalFree;
    invoice.totalIgv = totalIgv;
    invoice.totalDiscounts = totalDiscounts;
    invoice.total = totalTaxed + totalUnaffected + totalExonerated + totalIgv;
  }

  private getIgvPercentageByType(igvType: number): number {
    if (igvType === 1) {
      return 18;
    }
    return 0;
  }
}
