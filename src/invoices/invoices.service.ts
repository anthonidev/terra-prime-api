import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindInvoicesDto } from './dto/find-invoices.dto';
import { AnnulInvoiceDto } from './dto/annul-invoice.dto';
import { NubefactAdapter } from 'src/common/adapters/nubefact.adapter';
import { NubefactInvoiceDto } from './dto/nubefact-invoice.dto';
import { NubefactInvoiceItemDto } from './dto/nubefact-invoice-item.dto';
import { NubefactResponseDto } from './dto/nubefact-response.dto';
import { NubefactAnnulInvoiceDto } from './dto/nubefact-annul-invoice.dto';
import { NubefactAnnulResponseDto } from './dto/nubefact-annul-response.dto';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { User } from 'src/user/entities/user.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { InvoiceSeriesConfig } from './entities/invoice-series-config.entity';
import { UnitOfMeasure } from './enums/unit-of-measure.enum';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Financing } from 'src/admin-sales/financing/entities/financing.entity';
import { ClientDocumentType } from './enums/client-document-type.enum';
import { CurrencyType } from 'src/project/entities/project.entity';
import { Currency } from './enums/currency.enum';
import { IgvType } from './enums/igv-type.enum';
import { DocumentType } from './enums/document-type.enum';
import { CreditNoteType, CreditNoteTypeDescriptions } from './enums/credit-note-type.enum';
import { DebitNoteType, DebitNoteTypeDescriptions } from './enums/debit-note-type.enum';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { PaginationHelper, PaginatedResult } from 'src/common/helpers/pagination.helper';

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
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Financing)
    private readonly financingRepository: Repository<Financing>,
    private readonly dataSource: DataSource,
    private readonly nubefactAdapter: NubefactAdapter,
  ) { }

  async create(createInvoiceDto: CreateInvoiceDto, user: User): Promise<Invoice> {
    // Buscar el pago relacionado
    const payment = await this.paymentRepository.findOne({
      where: { id: createInvoiceDto.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Obtener currency automáticamente desde payment -> sale -> lot -> project
    const currencyData = await this.getCurrencyFromPayment(payment);

    // Crear una transacción para garantizar que si falla Nubefact, no se guarde la factura
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Obtener serie y número automáticamente usando el queryRunner de la transacción
      const { series, number } = await this.getNextSeriesNumber(
        createInvoiceDto.documentType,
        createInvoiceDto.relatedInvoiceId,
        queryRunner
      );

      const invoice = this.invoiceRepository.create({
        ...createInvoiceDto,
        series,
        number,
        fullNumber: `${series}-${number}`,
        createdBy: user,
        payment: payment,
        status: InvoiceStatus.DRAFT,
        currency: currencyData, // Currency automático
      });

      // Generar items automáticamente desde payment metadata
      const items = await this.generateInvoiceItemsFromPayment(payment);

      invoice.items = items;
      this.calculateInvoiceTotals(invoice);

      // Guardar la factura dentro de la transacción
      const savedInvoice = await queryRunner.manager.save(invoice);

      // Enviar automáticamente a SUNAT
      const nubefactDto = this.mapToNubefactDto(savedInvoice);
      const response = await this.nubefactAdapter.post<NubefactResponseDto>(
        '',
        nubefactDto,
      );

      // Si Nubefact responde (aunque sea con error), actualizar la factura
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
        await queryRunner.manager.save(payment);
      } else {
        savedInvoice.status = InvoiceStatus.REJECTED;
      }

      // Guardar los cambios finales de la factura
      const finalInvoice = await queryRunner.manager.save(savedInvoice);

      // Si todo salió bien, confirmar la transacción
      await queryRunner.commitTransaction();

      return finalInvoice;
    } catch (error) {
      // Si algo falla (Nubefact o cualquier otro error), revertir todo
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar el query runner
      await queryRunner.release();
    }
  }

  async findAll(filters: FindInvoicesDto): Promise<PaginatedResult<Invoice>> {
    const {
      page = 1,
      limit = 10,
      order = 'DESC',
      startDate,
      endDate,
    } = filters;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .leftJoinAndSelect('invoice.payment', 'payment')
      .leftJoinAndSelect('invoice.relatedInvoice', 'relatedInvoice');

    // Aplicar filtros de fecha solo si se proporcionan
    if (startDate) {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      queryBuilder.andWhere('invoice.createdAt >= :startDate', {
        startDate: startDateTime,
      });
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('invoice.createdAt <= :endDate', {
        endDate: endDateTime,
      });
    }

    // Aplicar ordenamiento y paginación
    queryBuilder
      .orderBy('invoice.createdAt', order)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalItems] = await queryBuilder.getManyAndCount();

    return PaginationHelper.createPaginatedResponse(items, totalItems, filters);
  }

  async findOne(paymentId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { payment: { id: paymentId } },
      relations: ['items', 'createdBy', 'relatedInvoice', 'payment'],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada para el pago especificado');
    }

    return invoice;
  }

  /**
   * Anula una factura en Nubefact/SUNAT
   * Solo se pueden anular facturas que fueron aceptadas por SUNAT
   */
  async annulInvoice(invoiceId: number, annulDto: AnnulInvoiceDto): Promise<Invoice> {
    // Buscar la factura con sus relaciones
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['items', 'createdBy', 'payment', 'relatedInvoice'],
    });

    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    // Validar que la factura esté aceptada por SUNAT
    // if (invoice.status !== InvoiceStatus.ACCEPTED) {
    //   throw new BadRequestException(
    //     `Solo se pueden anular facturas aceptadas por SUNAT. Estado actual: ${invoice.status}`
    //   );
    // }

    // Construir el DTO para Nubefact
    const nubefactAnnulDto: NubefactAnnulInvoiceDto = {
      operacion: 'generar_anulacion',
      tipo_de_comprobante: invoice.documentType,
      serie: invoice.series,
      numero: invoice.number,
      motivo: annulDto.reason,
      codigo_unico: annulDto.codigo_unico || invoice.uniqueCode || '',
    };

    // Enviar la anulación a Nubefact
    const response = await this.nubefactAdapter.post<NubefactAnnulResponseDto>(
      '',
      nubefactAnnulDto,
    );

    // Actualizar el estado de la factura
    invoice.status = InvoiceStatus.CANCELLED;
    invoice.sunatAccepted = String(response.aceptada_por_sunat);
    invoice.sunatDescription = response.sunat_description;
    invoice.sunatNote = response.sunat_note;
    invoice.sunatResponseCode = response.sunat_responsecode;
    invoice.sunatSoapError = response.sunat_soap_error;

    // Guardar los enlaces de la anulación en el metadata
    invoice.metadata = {
      ...invoice.metadata,
      annulment: {
        motivo: annulDto.reason,
        annulledAt: new Date().toISOString(),
        enlace: response.enlace,
        sunat_ticket_numero: response.sunat_ticket_numero,
        enlace_del_pdf: response.enlace_del_pdf,
        enlace_del_xml: response.enlace_del_xml,
        enlace_del_cdr: response.enlace_del_cdr,
      },
    };

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Anula una factura asociada a un payment (si existe)
   * Usado cuando se anula un pago de cuotas
   */
  async annulInvoiceByPaymentId(paymentId: number, motivo: string): Promise<Invoice | null> {
    // Buscar si existe una factura para este payment
    const invoice = await this.invoiceRepository.findOne({
      where: { payment: { id: paymentId } },
      relations: ['items', 'createdBy', 'payment', 'relatedInvoice'],
    });

    // Si no hay factura, no hay nada que anular
    if (!invoice) {
      return null;
    }

    // Solo anular si la factura fue aceptada por SUNAT
    if (invoice.status !== InvoiceStatus.ACCEPTED) {
      console.log(`⚠️ Factura ${invoice.id} no está ACEPTADA (estado: ${invoice.status}), se omite anulación`);
      return null;
    }

    // Construir el DTO para Nubefact
    const nubefactAnnulDto: NubefactAnnulInvoiceDto = {
      operacion: 'generar_anulacion',
      tipo_de_comprobante: invoice.documentType,
      serie: invoice.series,
      numero: invoice.number,
      motivo: motivo,
      codigo_unico: invoice.uniqueCode || '',
    };

    try {
      // Enviar la anulación a Nubefact
      const response = await this.nubefactAdapter.post<NubefactAnnulResponseDto>(
        '',
        nubefactAnnulDto,
      );

      // Actualizar el estado de la factura
      invoice.status = InvoiceStatus.CANCELLED;
      invoice.sunatAccepted = String(response.aceptada_por_sunat);
      invoice.sunatDescription = response.sunat_description;
      invoice.sunatNote = response.sunat_note;
      invoice.sunatResponseCode = response.sunat_responsecode;
      invoice.sunatSoapError = response.sunat_soap_error;

      // Guardar los enlaces de la anulación en el metadata
      invoice.metadata = {
        ...invoice.metadata,
        annulment: {
          motivo: motivo,
          annulledAt: new Date().toISOString(),
          enlace: response.enlace,
          sunat_ticket_numero: response.sunat_ticket_numero,
          enlace_del_pdf: response.enlace_del_pdf,
          enlace_del_xml: response.enlace_del_xml,
          enlace_del_cdr: response.enlace_del_cdr,
        },
      };

      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      console.error(`❌ Error al anular factura ${invoice.id} en Nubefact:`, error.message);
      // No lanzar el error, solo loguearlo para que no bloquee la anulación del payment
      // La factura quedará en estado ACCEPTED pero el payment estará CANCELLED
      return null;
    }
  }

  private async getNextSeriesNumber(
    documentType: number,
    relatedInvoiceId?: number,
    providedQueryRunner?: QueryRunner
  ): Promise<{ series: string; number: number }> {
    // Si se proporciona un queryRunner, usarlo (forma parte de una transacción mayor)
    // Si no, crear uno nuevo (para mantener compatibilidad)
    const queryRunner = providedQueryRunner || this.dataSource.createQueryRunner();
    const shouldManageTransaction = !providedQueryRunner;

    if (shouldManageTransaction) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

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

      // Solo confirmar si manejamos nuestra propia transacción
      if (shouldManageTransaction) {
        await queryRunner.commitTransaction();
      }

      return {
        series: seriesConfig.series,
        number: seriesConfig.lastNumber,
      };
    } catch (error) {
      // Solo revertir si manejamos nuestra propia transacción
      if (shouldManageTransaction) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Solo liberar si manejamos nuestra propia transacción
      if (shouldManageTransaction) {
        await queryRunner.release();
      }
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

    // Para notas de crédito o débito
    if (invoice.relatedInvoice) {
      // Determinar el tipo de documento que se modifica (1 = FACTURA, 2 = BOLETA)
      nubefactDto.documento_que_se_modifica_tipo = invoice.relatedInvoice.documentType;
      nubefactDto.documento_que_se_modifica_serie = invoice.relatedInvoice.series;
      nubefactDto.documento_que_se_modifica_numero = invoice.relatedInvoice.number;

      // Asignar el tipo de nota según sea crédito o débito
      if (invoice.documentType === DocumentType.CREDIT_NOTE) {
        nubefactDto.tipo_de_nota_de_credito = parseInt(invoice.noteReasonCode, 10);
      } else if (invoice.documentType === DocumentType.DEBIT_NOTE) {
        nubefactDto.tipo_de_nota_de_debito = parseInt(invoice.noteReasonCode, 10);
      }

      // Mantener campos legacy por compatibilidad
      nubefactDto.codigo_tipo_nota = invoice.noteReasonCode;
      nubefactDto.motivo_nota = invoice.noteReasonDescription;
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

      // Gravado (1-7): suma a totalTaxed
      if (item.igvType >= 1 && item.igvType <= 7) {
        totalTaxed += item.subtotal;
      }
      // Exonerado (8, 17): suma a totalExonerated
      else if (item.igvType === 8 || item.igvType === 17) {
        totalExonerated += item.subtotal;
      }
      // Inafecto (9-15, 20): suma a totalUnaffected
      else if ((item.igvType >= 9 && item.igvType <= 15) || item.igvType === 20) {
        totalUnaffected += item.subtotal;
      }
      // Exportación (16): suma a totalUnaffected
      else if (item.igvType === 16) {
        totalUnaffected += item.subtotal;
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
    // Gravado (1-7): aplica IGV 18%
    if (igvType >= 1 && igvType <= 7) {
      return 18;
    }
    // Exonerado, Inafecto, Exportación: sin IGV
    return 0;
  }

  /**
   * Genera los items de la factura automáticamente desde el payment y su metadata
   */
  private async generateInvoiceItemsFromPayment(payment: Payment): Promise<InvoiceItem[]> {
    const items: InvoiceItem[] = [];

    // Log de debugging
    console.log('🔍 Payment metadata completo:', JSON.stringify(payment.metadata, null, 2));
    console.log('🔍 Payment relatedEntityType:', payment.relatedEntityType);
    console.log('🔍 Payment amount:', payment.amount);

    // Caso 1: Pago de cuotas de financiamiento (financingInstallments) - SIN IGV
    if (payment.relatedEntityType === 'financingInstallments') {
      const cuotasAfectadas = payment.metadata?.['Cuotas afectadas'];

      console.log('🔍 Cuotas afectadas encontradas:', JSON.stringify(cuotasAfectadas, null, 2));

      if (cuotasAfectadas && typeof cuotasAfectadas === 'object') {
        for (const [cuotaKey, cuotaData] of Object.entries(cuotasAfectadas)) {
          const modo = (cuotaData as any)?.Modo || 'Total';
          // Intentar ambos nombres de campo para compatibilidad
          const montoAplicado = (cuotaData as any)?.['Monto aplicado'] || (cuotaData as any)?.['Aplicado a cuota'] || 0;

          // Extraer número de cuota del key "Cuota X"
          const cuotaNumber = cuotaKey.replace('Cuota ', '');

          console.log(`🔍 Procesando ${cuotaKey}: modo=${modo}, montoAplicado=${montoAplicado}`);

          const item = this.invoiceItemRepository.create({
            unitOfMeasure: UnitOfMeasure.NIU,
            code: '',
            description: `Pago ${modo} de la cuota ${cuotaNumber}`,
            quantity: 1,
            unitValue: montoAplicado,
            unitPrice: 0, // Se calculará
            discount: 0,
            subtotal: 0, // Se calculará
            igvType: IgvType.UNAFFECTED_ONEROUS_OPERATION, // Inafecto - SIN IGV para pago de cuotas
            igv: 0,
            total: 0, // Se calculará
          });

          this.calculateItemTotals(item);
          items.push(item);
        }
      }
    }
    // Caso 1.1: Pago de moras (lateFee) - CON IGV 18% INCLUIDO
    else if (payment.relatedEntityType === 'lateFee') {
      const morasAfectadas = payment.metadata?.['Moras afectadas'];
      const IGV_RATE = 1.18; // Factor para extraer IGV incluido

      console.log('🔍 Moras afectadas encontradas:', JSON.stringify(morasAfectadas, null, 2));

      if (morasAfectadas && typeof morasAfectadas === 'object') {
        for (const [cuotaKey, moraData] of Object.entries(morasAfectadas)) {
          const modo = (moraData as any)?.Modo || 'Total';
          const montoAplicado = (moraData as any)?.['Mora aplicada'] || 0;

          // Extraer número de cuota del key "Cuota X"
          const cuotaNumber = cuotaKey.replace('Cuota ', '');

          // Calcular base gravable (IGV incluido en el monto)
          const baseGravable = Number((montoAplicado / IGV_RATE).toFixed(2));

          console.log(`🔍 Procesando mora ${cuotaKey}: modo=${modo}, montoAplicado=${montoAplicado}, baseGravable=${baseGravable}`);

          const item = this.invoiceItemRepository.create({
            unitOfMeasure: UnitOfMeasure.NIU,
            code: '',
            description: `Pago ${modo} de mora - cuota ${cuotaNumber}`,
            quantity: 1,
            unitValue: baseGravable, // Base sin IGV
            unitPrice: 0, // Se calculará
            discount: 0,
            subtotal: 0, // Se calculará
            igvType: IgvType.TAXED_ONEROUS_OPERATION, // Gravado 18% IGV para moras
            igv: 0,
            total: 0, // Se calculará
          });

          this.calculateItemTotals(item);
          items.push(item);
        }
      } else {
        // Fallback: si no hay metadata detallada, crear un item genérico
        const baseGravable = Number((payment.amount / IGV_RATE).toFixed(2));

        const item = this.invoiceItemRepository.create({
          unitOfMeasure: UnitOfMeasure.NIU,
          code: '',
          description: 'Pago de moras de financiamiento',
          quantity: 1,
          unitValue: baseGravable, // Base sin IGV
          unitPrice: 0,
          discount: 0,
          subtotal: 0,
          igvType: IgvType.TAXED_ONEROUS_OPERATION, // Gravado 18% IGV para moras
          igv: 0,
          total: 0,
        });

        this.calculateItemTotals(item);
        items.push(item);
      }
    }
    // Caso 2: Pago de inicial de financing - SIN IGV
    else if (payment.relatedEntityType === 'financing') {
      const item = this.invoiceItemRepository.create({
        unitOfMeasure: UnitOfMeasure.NIU,
        code: '',
        description: 'Pago de cuota inicial',
        quantity: 1,
        unitValue: payment.amount,
        unitPrice: 0, // Se calculará
        discount: 0,
        subtotal: 0, // Se calculará
        igvType: IgvType.UNAFFECTED_ONEROUS_OPERATION, // Inafecto - SIN IGV
        igv: 0,
        total: 0, // Se calculará
      });

      this.calculateItemTotals(item);
      items.push(item);
    }
    // Caso 3: Pago completo de venta (sale) - SIN IGV
    else if (payment.relatedEntityType === 'sale') {
      const item = this.invoiceItemRepository.create({
        unitOfMeasure: UnitOfMeasure.NIU,
        code: '',
        description: 'Pago de venta de lote',
        quantity: 1,
        unitValue: payment.amount,
        unitPrice: 0, // Se calculará
        discount: 0,
        subtotal: 0, // Se calculará
        igvType: IgvType.UNAFFECTED_ONEROUS_OPERATION, // Inafecto - SIN IGV
        igv: 0,
        total: 0, // Se calculará
      });

      this.calculateItemTotals(item);
      items.push(item);
    }
    // Caso 4: Pago de reserva (reservation) - SIN IGV
    else if (payment.relatedEntityType === 'reservation') {
      const item = this.invoiceItemRepository.create({
        unitOfMeasure: UnitOfMeasure.NIU,
        code: '',
        description: 'Pago de reserva de lote',
        quantity: 1,
        unitValue: payment.amount,
        unitPrice: 0, // Se calculará
        discount: 0,
        subtotal: 0, // Se calculará
        igvType: IgvType.UNAFFECTED_ONEROUS_OPERATION, // Inafecto - SIN IGV
        igv: 0,
        total: 0, // Se calculará
      });

      this.calculateItemTotals(item);
      items.push(item);
    }
    else {
      throw new BadRequestException(
        `Tipo de entidad relacionada no soportado para facturación: ${payment.relatedEntityType}`
      );
    }

    if (items.length === 0) {
      throw new BadRequestException('No se pudieron generar items para la factura');
    }

    return items;
  }

  /**
   * Obtiene el currency desde el payment siguiendo la cadena:
   * payment -> financing/sale/reservation -> lot -> block -> stage -> project
   */
  private async getCurrencyFromPayment(payment: Payment): Promise<Currency> {
    let sale: Sale | null = null;

    // Si el payment no tiene relatedEntityType o relatedEntityId, lanzar error
    if (!payment.relatedEntityType || !payment.relatedEntityId) {
      throw new BadRequestException(
        'El pago no tiene una entidad relacionada (financing o sale)'
      );
    }

    // Determinar el tipo de entidad relacionada y obtener la sale
    if (payment.relatedEntityType === 'financing') {
      const financing = await this.financingRepository.findOne({
        where: { id: payment.relatedEntityId },
        relations: [
          'sale',
          'sale.lot',
          'sale.lot.block',
          'sale.lot.block.stage',
          'sale.lot.block.stage.project'
        ],
      });

      if (!financing) {
        throw new NotFoundException(
          `Financing con ID ${payment.relatedEntityId} no encontrado`
        );
      }

      if (!financing.sale) {
        throw new BadRequestException(
          'El financing no tiene una venta asociada'
        );
      }

      sale = financing.sale;
    }
    else if (payment.relatedEntityType === 'financingInstallments' || payment.relatedEntityType === 'lateFee') {
      // Tanto cuotas como moras usan el financing ID
      const financing = await this.financingRepository.findOne({
        where: { id: payment.relatedEntityId },
        relations: [
          'sale',
          'sale.lot',
          'sale.lot.block',
          'sale.lot.block.stage',
          'sale.lot.block.stage.project'
        ],
      });

      if (!financing) {
        throw new NotFoundException(
          `Financing con ID ${payment.relatedEntityId} no encontrado`
        );
      }

      if (!financing.sale) {
        throw new BadRequestException(
          'El financing no tiene una venta asociada'
        );
      }

      sale = financing.sale;
    }
    else if (payment.relatedEntityType === 'sale') {
      sale = await this.saleRepository.findOne({
        where: { id: payment.relatedEntityId },
        relations: [
          'lot',
          'lot.block',
          'lot.block.stage',
          'lot.block.stage.project'
        ],
      });

      if (!sale) {
        throw new NotFoundException(
          `Venta con ID ${payment.relatedEntityId} no encontrada`
        );
      }
    }
    else if (payment.relatedEntityType === 'reservation') {
      sale = await this.saleRepository.findOne({
        where: { id: payment.relatedEntityId },
        relations: [
          'lot',
          'lot.block',
          'lot.block.stage',
          'lot.block.stage.project'
        ],
      });

      if (!sale) {
        throw new NotFoundException(
          `Venta con ID ${payment.relatedEntityId} no encontrada (pago de reserva)`
        );
      }
    }
    else {
      throw new BadRequestException(
        `Tipo de entidad relacionada no válido: ${payment.relatedEntityType}`
      );
    }

    // Verificar que la venta tenga un lot y su cadena completa hasta project
    if (!sale.lot) {
      throw new BadRequestException('La venta no tiene un lote asociado');
    }
    if (!sale.lot.block) {
      throw new BadRequestException('El lote no tiene un bloque asociado');
    }
    if (!sale.lot.block.stage) {
      throw new BadRequestException('El bloque no tiene una etapa asociada');
    }
    if (!sale.lot.block.stage.project) {
      throw new BadRequestException('La etapa no tiene un proyecto asociado');
    }

    const project = sale.lot.block.stage.project;

    // Mapear el currency del project al currency de la factura
    let invoiceCurrency: Currency;
    if (project.currency === CurrencyType.PEN) {
      invoiceCurrency = Currency.PEN;
    } else if (project.currency === CurrencyType.USD) {
      invoiceCurrency = Currency.USD;
    } else {
      // Por defecto, usar PEN
      invoiceCurrency = Currency.PEN;
    }

    return invoiceCurrency;
  }

  /**
   * Crear una Nota de Crédito asociada a una factura o boleta existente
   */
  async createCreditNote(createCreditNoteDto: CreateCreditNoteDto, user: User): Promise<Invoice> {
    // Buscar la factura/boleta original
    const relatedInvoice = await this.invoiceRepository.findOne({
      where: { id: createCreditNoteDto.relatedInvoiceId },
      relations: ['items', 'payment'],
    });

    if (!relatedInvoice) {
      throw new NotFoundException('Factura o boleta original no encontrada');
    }

    // Validar que el documento original sea una factura o boleta (no otra nota)
    if (relatedInvoice.documentType !== DocumentType.INVOICE && relatedInvoice.documentType !== DocumentType.RECEIPT) {
      throw new BadRequestException('Solo se pueden crear notas de crédito para facturas o boletas');
    }

    // Validar que la factura original esté aceptada por SUNAT
    if (relatedInvoice.status !== InvoiceStatus.ACCEPTED) {
      throw new BadRequestException('Solo se pueden crear notas de crédito para documentos aceptados por SUNAT');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Determinar la serie según el documento original (F para facturas, B para boletas)
      const { series, number } = await this.getNextSeriesNumber(
        DocumentType.CREDIT_NOTE,
        createCreditNoteDto.relatedInvoiceId,
        queryRunner
      );

      // Obtener descripción del tipo de nota
      const reasonDescription = createCreditNoteDto.reasonDescription ||
        CreditNoteTypeDescriptions[createCreditNoteDto.creditNoteType];

      // Crear la nota de crédito
      const creditNote = this.invoiceRepository.create({
        documentType: DocumentType.CREDIT_NOTE,
        series,
        number,
        fullNumber: `${series}-${number}`,
        sunatTransaction: relatedInvoice.sunatTransaction,
        clientDocumentType: relatedInvoice.clientDocumentType as ClientDocumentType,
        clientDocumentNumber: relatedInvoice.clientDocumentNumber,
        clientName: relatedInvoice.clientName,
        clientAddress: relatedInvoice.clientAddress,
        clientEmail: relatedInvoice.clientEmail,
        currency: relatedInvoice.currency,
        exchangeRate: relatedInvoice.exchangeRate,
        igvPercentage: relatedInvoice.igvPercentage,
        sendAutomaticallyToSunat: true,
        sendAutomaticallyToClient: false,
        observations: createCreditNoteDto.observations,
        relatedInvoice: relatedInvoice,
        noteReasonCode: String(createCreditNoteDto.creditNoteType),
        noteReasonDescription: reasonDescription,
        createdBy: user,
        status: InvoiceStatus.DRAFT,
      });

      // Generar items - usar monto específico o copiar de la factura original
      const items: InvoiceItem[] = [];

      if (createCreditNoteDto.amount) {
        // Monto específico proporcionado
        const item = this.invoiceItemRepository.create({
          unitOfMeasure: UnitOfMeasure.NIU,
          code: '',
          description: reasonDescription,
          quantity: 1,
          unitValue: createCreditNoteDto.amount,
          unitPrice: 0,
          discount: 0,
          subtotal: 0,
          igvType: relatedInvoice.items[0]?.igvType || IgvType.TAXED_ONEROUS_OPERATION,
          igv: 0,
          total: 0,
        });
        this.calculateItemTotals(item);
        items.push(item);
      } else {
        // Copiar items de la factura original
        for (const originalItem of relatedInvoice.items) {
          const item = this.invoiceItemRepository.create({
            unitOfMeasure: originalItem.unitOfMeasure,
            code: originalItem.code,
            description: originalItem.description,
            quantity: originalItem.quantity,
            unitValue: originalItem.unitValue,
            unitPrice: originalItem.unitPrice,
            discount: originalItem.discount,
            subtotal: originalItem.subtotal,
            igvType: originalItem.igvType,
            igv: originalItem.igv,
            total: originalItem.total,
          });
          items.push(item);
        }
      }

      creditNote.items = items;
      this.calculateInvoiceTotals(creditNote);

      // Guardar la nota de crédito
      const savedCreditNote = await queryRunner.manager.save(creditNote);

      // Enviar a SUNAT
      const nubefactDto = this.mapToNubefactDto(savedCreditNote);
      const response = await this.nubefactAdapter.post<NubefactResponseDto>('', nubefactDto);

      // Actualizar con respuesta de SUNAT
      savedCreditNote.status = InvoiceStatus.SENT;
      savedCreditNote.sunatAccepted = response.aceptada_por_sunat;
      savedCreditNote.sunatDescription = response.sunat_description;
      savedCreditNote.sunatNote = response.sunat_note;
      savedCreditNote.sunatResponseCode = response.sunat_responsecode;
      savedCreditNote.sunatSoapError = response.sunat_soap_error;
      savedCreditNote.pdfUrl = response.enlace_del_pdf;
      savedCreditNote.xmlUrl = response.enlace_del_xml;
      savedCreditNote.cdrUrl = response.enlace_del_cdr;

      if (response.aceptada_por_sunat === '1' || response.aceptada_por_sunat === 'true') {
        savedCreditNote.status = InvoiceStatus.ACCEPTED;
      } else {
        savedCreditNote.status = InvoiceStatus.REJECTED;
      }

      const finalCreditNote = await queryRunner.manager.save(savedCreditNote);
      await queryRunner.commitTransaction();

      return finalCreditNote;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Crear una Nota de Débito asociada a una factura o boleta existente
   */
  async createDebitNote(createDebitNoteDto: CreateDebitNoteDto, user: User): Promise<Invoice> {
    // Buscar la factura/boleta original
    const relatedInvoice = await this.invoiceRepository.findOne({
      where: { id: createDebitNoteDto.relatedInvoiceId },
      relations: ['items', 'payment'],
    });

    if (!relatedInvoice) {
      throw new NotFoundException('Factura o boleta original no encontrada');
    }

    // Validar que el documento original sea una factura o boleta
    if (relatedInvoice.documentType !== DocumentType.INVOICE && relatedInvoice.documentType !== DocumentType.RECEIPT) {
      throw new BadRequestException('Solo se pueden crear notas de débito para facturas o boletas');
    }

    // Validar que la factura original esté aceptada por SUNAT
    if (relatedInvoice.status !== InvoiceStatus.ACCEPTED) {
      throw new BadRequestException('Solo se pueden crear notas de débito para documentos aceptados por SUNAT');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { series, number } = await this.getNextSeriesNumber(
        DocumentType.DEBIT_NOTE,
        createDebitNoteDto.relatedInvoiceId,
        queryRunner
      );

      // Obtener descripción del tipo de nota
      const reasonDescription = createDebitNoteDto.reasonDescription ||
        DebitNoteTypeDescriptions[createDebitNoteDto.debitNoteType];

      // Descripción del cargo
      const chargeDescription = createDebitNoteDto.chargeDescription || reasonDescription;

      // Determinar el tipo de IGV según el tipo de nota de débito
      // Para moras (LATE_FEE_INTEREST), usar IGV gravado (18%)
      const igvType = createDebitNoteDto.debitNoteType === DebitNoteType.LATE_FEE_INTEREST
        ? IgvType.TAXED_ONEROUS_OPERATION
        : (relatedInvoice.items[0]?.igvType || IgvType.TAXED_ONEROUS_OPERATION);

      // Crear la nota de débito
      const debitNote = this.invoiceRepository.create({
        documentType: DocumentType.DEBIT_NOTE,
        series,
        number,
        fullNumber: `${series}-${number}`,
        sunatTransaction: relatedInvoice.sunatTransaction,
        clientDocumentType: relatedInvoice.clientDocumentType as ClientDocumentType,
        clientDocumentNumber: relatedInvoice.clientDocumentNumber,
        clientName: relatedInvoice.clientName,
        clientAddress: relatedInvoice.clientAddress,
        clientEmail: relatedInvoice.clientEmail,
        currency: relatedInvoice.currency,
        exchangeRate: relatedInvoice.exchangeRate,
        igvPercentage: relatedInvoice.igvPercentage,
        sendAutomaticallyToSunat: true,
        sendAutomaticallyToClient: false,
        observations: createDebitNoteDto.observations,
        relatedInvoice: relatedInvoice,
        noteReasonCode: String(createDebitNoteDto.debitNoteType),
        noteReasonDescription: reasonDescription,
        createdBy: user,
        status: InvoiceStatus.DRAFT,
      });

      // Generar item con el monto adicional
      const item = this.invoiceItemRepository.create({
        unitOfMeasure: UnitOfMeasure.NIU,
        code: '',
        description: chargeDescription,
        quantity: 1,
        unitValue: createDebitNoteDto.amount,
        unitPrice: 0,
        discount: 0,
        subtotal: 0,
        igvType: igvType,
        igv: 0,
        total: 0,
      });

      this.calculateItemTotals(item);
      debitNote.items = [item];
      this.calculateInvoiceTotals(debitNote);

      // Guardar la nota de débito
      const savedDebitNote = await queryRunner.manager.save(debitNote);

      // Enviar a SUNAT
      const nubefactDto = this.mapToNubefactDto(savedDebitNote);
      const response = await this.nubefactAdapter.post<NubefactResponseDto>('', nubefactDto);

      // Actualizar con respuesta de SUNAT
      savedDebitNote.status = InvoiceStatus.SENT;
      savedDebitNote.sunatAccepted = response.aceptada_por_sunat;
      savedDebitNote.sunatDescription = response.sunat_description;
      savedDebitNote.sunatNote = response.sunat_note;
      savedDebitNote.sunatResponseCode = response.sunat_responsecode;
      savedDebitNote.sunatSoapError = response.sunat_soap_error;
      savedDebitNote.pdfUrl = response.enlace_del_pdf;
      savedDebitNote.xmlUrl = response.enlace_del_xml;
      savedDebitNote.cdrUrl = response.enlace_del_cdr;

      if (response.aceptada_por_sunat === '1' || response.aceptada_por_sunat === 'true') {
        savedDebitNote.status = InvoiceStatus.ACCEPTED;
      } else {
        savedDebitNote.status = InvoiceStatus.REJECTED;
      }

      const finalDebitNote = await queryRunner.manager.save(savedDebitNote);
      await queryRunner.commitTransaction();

      return finalDebitNote;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener las notas de crédito y débito asociadas a una factura o boleta
   */
  async findRelatedNotes(invoiceId: number): Promise<Invoice[]> {
    // Verificar que el invoice existe y es una factura o boleta
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Comprobante con ID ${invoiceId} no encontrado`);
    }

    if (invoice.documentType !== DocumentType.INVOICE && invoice.documentType !== DocumentType.RECEIPT) {
      throw new BadRequestException('Solo se pueden consultar notas para facturas o boletas');
    }

    // Buscar todas las notas de crédito y débito relacionadas
    const notes = await this.invoiceRepository.find({
      where: {
        relatedInvoice: { id: invoiceId },
      },
      relations: ['items', 'createdBy'],
      order: { createdAt: 'DESC' },
    });

    return notes;
  }
}
