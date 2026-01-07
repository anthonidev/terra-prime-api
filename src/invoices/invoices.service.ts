import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { NubefactAdapter } from 'src/common/adapters/nubefact.adapter';
import { NubefactInvoiceDto } from './dto/nubefact-invoice.dto';
import { NubefactInvoiceItemDto } from './dto/nubefact-invoice-item.dto';
import { NubefactResponseDto } from './dto/nubefact-response.dto';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { User } from 'src/user/entities/user.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { InvoiceSeriesConfig } from './entities/invoice-series-config.entity';
import { UnitOfMeasure } from './enums/unit-of-measure.enum';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(InvoiceSeriesConfig)
    private readonly seriesConfigRepository: Repository<InvoiceSeriesConfig>,
    private readonly dataSource: DataSource,
    private readonly nubefactAdapter: NubefactAdapter,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, user: User): Promise<Invoice> {
    // Buscar el pago relacionado
    const payment = await this.paymentRepository.findOne({
      where: { id: createInvoiceDto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Obtener serie y número automáticamente usando transacción
    const { series, number } = await this.getNextSeriesNumber(
      createInvoiceDto.documentType,
      createInvoiceDto.relatedInvoiceId
    );

    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      series,
      number,
      fullNumber: `${series}-${number}`,
      createdBy: user,
      payment: payment,
      status: InvoiceStatus.DRAFT,
    });

    const items = createInvoiceDto.items.map((itemDto) => {
      const item = this.invoiceItemRepository.create({
        ...itemDto,
        unitOfMeasure: itemDto.unitOfMeasure || UnitOfMeasure.NIU,
      });
      this.calculateItemTotals(item);
      return item;
    });

    invoice.items = items;
    this.calculateInvoiceTotals(invoice);

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Enviar automáticamente a SUNAT
    const nubefactDto = this.mapToNubefactDto(savedInvoice);
    const response = await this.nubefactAdapter.post<NubefactResponseDto>(
      '',
      nubefactDto,
    );

    savedInvoice.status = InvoiceStatus.SENT;
    savedInvoice.sunatAccepted = response.aceptada_por_sunat;
    savedInvoice.sunatDescription = response.sunat_description;
    savedInvoice.sunatNote = response.sunat_note;
    savedInvoice.sunatResponseCode = response.sunat_responsecode;
    savedInvoice.sunatSoapError = response.sunat_soap_error;
    savedInvoice.pdfUrl = response.enlace_del_pdf;
    savedInvoice.xmlUrl = response.enlace_del_xml;
    savedInvoice.cdrUrl = response.enlace_del_cdr;

    if (response.aceptada_por_sunat === '1' || response.aceptada_por_sunat === 'true') {
      savedInvoice.status = InvoiceStatus.ACCEPTED;

      // Actualizar el numberTicket del payment con el fullNumber de la factura
      payment.numberTicket = savedInvoice.fullNumber;
      await this.paymentRepository.save(payment);
    } else {
      savedInvoice.status = InvoiceStatus.REJECTED;
    }

    return await this.invoiceRepository.save(savedInvoice);
  }

  async findAll(): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      relations: ['items', 'createdBy', 'payment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'createdBy', 'relatedInvoice', 'payment'],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return invoice;
  }

  private async getNextSeriesNumber(
    documentType: number,
    relatedInvoiceId?: number
  ): Promise<{ series: string; number: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let targetDocumentType = documentType;

      // Para Notas de Crédito (3) y Débito (4), determinar la serie según el documento relacionado
      if ((documentType === 3 || documentType === 4) && relatedInvoiceId) {
        const relatedInvoice = await this.invoiceRepository.findOne({
          where: { id: relatedInvoiceId },
        });

        if (!relatedInvoice) {
          throw new NotFoundException('Factura relacionada no encontrada');
        }

        // Usar el mismo tipo de documento base (FACTURA o BOLETA) para determinar la serie
        targetDocumentType = relatedInvoice.documentType;
      }

      // Obtener la configuración de serie con bloqueo para evitar duplicados
      const seriesConfig = await queryRunner.manager
        .createQueryBuilder(InvoiceSeriesConfig, 'config')
        .setLock('pessimistic_write')
        .where('config.documentType = :documentType', { documentType: targetDocumentType })
        .andWhere('config.isActive = :isActive', { isActive: true })
        .getOne();

      if (!seriesConfig) {
        throw new BadRequestException(
          `No se encontró configuración de serie activa para el tipo de documento ${targetDocumentType}`
        );
      }

      // Incrementar el número
      seriesConfig.lastNumber += 1;
      await queryRunner.manager.save(seriesConfig);

      // Confirmar transacción
      await queryRunner.commitTransaction();

      return {
        series: seriesConfig.series,
        number: seriesConfig.lastNumber,
      };
    } catch (error) {
      // Revertir transacción en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el query runner
      await queryRunner.release();
    }
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
