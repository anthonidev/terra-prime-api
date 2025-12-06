import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as XLSX from 'xlsx';

// Entities
import { Project } from 'src/project/entities/project.entity';
import { Stage } from 'src/project/entities/stage.entity';
import { Block } from 'src/project/entities/block.entity';
import { Lot, LotStatus } from 'src/project/entities/lot.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { Client } from 'src/admin-sales/clients/entities/client.entity';
import { SecondaryClient } from 'src/admin-sales/secondary-client/entities/secondary-client.entity';
import { Sale } from 'src/admin-sales/sales/entities/sale.entity';
import { Financing } from 'src/admin-sales/financing/entities/financing.entity';
import { FinancingInstallments } from 'src/admin-sales/financing/entities/financing-installments.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { PaymentDetails } from 'src/admin-payments/payments/entities/payment-details.entity';
import { User } from 'src/user/entities/user.entity';
import { SecondaryClientSale } from 'src/admin-sales/secondary-client/entities/secondary-client-sale.entity';

// DTOs
import { BulkImportSalesDto } from './dto/bulk-import-sales.dto';
import { SaleImportDto } from './dto/sale-import.dto';

// Enums
import { SaleType } from 'src/admin-sales/sales/enums/sale-type.enum';
import { StatusSale } from 'src/admin-sales/sales/enums/status-sale.enum';
import { MethodPayment } from 'src/admin-payments/payments/enums/method-payment.enum';
import { FinancingType } from 'src/admin-sales/financing/enums/financing-type.enum';

// Interfaces
import { ImportResult } from './interfaces/import-result.interface';
import { StatusPayment } from 'src/admin-payments/payments/enums/status-payments.enum';
import { StatusFinancingInstallments } from 'src/admin-sales/financing/enums/status-financing-installments.enum';

@Injectable()
export class MigrationsService {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validar y transformar Excel a JSON
   */
  async validateAndTransformExcel(buffer: Buffer): Promise<{
    data: BulkImportSalesDto;
    summary: {
      totalRows: number;
      totalSales: number;
      warnings: string[];
    };
  }> {
    this.logger.log('📊 Iniciando lectura y validación de Excel...');

    // 1. Leer Excel
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 2. Convertir a JSON (array de objetos)
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false
    });

    if (rawData.length < 2) {
      throw new BadRequestException('El Excel está vacío o no tiene datos');
    }

    this.logger.log(`📋 Total de filas en Excel: ${rawData.length - 1} (sin contar header)`);

    // 3. Eliminar header (primera fila)
    const dataRows = rawData.slice(1);

    // 4. Transformar filas a estructura intermedia
    const warnings: string[] = [];
    const salesMap = new Map<string, any[]>(); // Agrupar por código de venta

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y saltamos header

      try {
        const excelCode = this.cleanString(row[0]); // Columna 0 = código

        if (!excelCode) {
          warnings.push(`Fila ${rowNumber}: Sin código de venta, se omitirá`);
          continue;
        }

        if (!salesMap.has(excelCode)) {
          salesMap.set(excelCode, []);
        }

        salesMap.get(excelCode).push({ row, rowNumber });
      } catch (error) {
        warnings.push(`Fila ${rowNumber}: Error al procesar - ${error.message}`);
      }
    }

    this.logger.log(`🔢 Total de ventas únicas identificadas: ${salesMap.size}`);

    // 5. Transformar cada grupo de filas a una venta, verificando duplicados y consistencia
    const sales = [];
    for (const [excelCode, rows] of salesMap.entries()) {
      const firstRowData = rows[0].row;



      // VALIDATION 2: Mandatory Lot Info
      const projectName = this.cleanString(firstRowData[2]);
      const stageName = this.cleanString(firstRowData[3]);
      const blockName = this.cleanString(firstRowData[6]);
      const lotName = this.cleanString(firstRowData[7]);

      if (!projectName || !stageName || !blockName || !lotName) {
        warnings.push(`Venta ${excelCode}: Falta información de Lote/Proyecto (Proyecto: ${projectName || 'N/A'}, Etapa: ${stageName || 'N/A'}, Bloque: ${blockName || 'N/A'}, Lote: ${lotName || 'N/A'}). Se omitirá.`);
        continue;
      }

      // PRE-EXISTENCE CHECK
      const existingSale = await this.saleRepo.createQueryBuilder("sale")
        .where("sale.metadata ->> 'Codigo' = :excelCode", { excelCode })
        .getOne();

      if (existingSale) {
        warnings.push(`Venta ${excelCode}: Ya fue registrada previamente (ID: ${existingSale.id}), se omitirá`);
        continue;
      }

      try {
        const sale = await this.transformRowsToSale(excelCode, rows);
        sales.push(sale);
      } catch (error) {
        warnings.push(`Venta ${excelCode}: Error en transformación - ${error.message}`);
        this.logger.warn(`⚠️ Error en transformación de venta ${excelCode}: ${error.message}`);
      }
    }

    this.logger.log(`✅ Transformación completada: ${sales.length} ventas generadas para importación`);

    return {
      data: {
        vendorId: '5f3e7c0a-2b8f-4a32-9e5e-3c409ad21bfa', // Vendedor fijo para migraciones
        sales,
      },
      summary: {
        totalRows: dataRows.length,
        totalSales: sales.length,
        warnings,
      },
    };
  }

  /**
   * Importación masiva de ventas desde JSON
   */
  async bulkImportSales(dto: BulkImportSalesDto): Promise<ImportResult> {
    this.logger.log(`🚀 Iniciando importación masiva de ${dto.sales.length} ventas`);

    // Validar que el vendedor existe
    const vendor = await this.userRepo.findOne({ where: { id: dto.vendorId } });
    if (!vendor) {
      throw new NotFoundException(`Vendedor con ID ${dto.vendorId} no encontrado`);
    }

    const results = {
      total: dto.sales.length,
      success: 0,
      failed: 0,
      errors: [],
      salesCreated: [],
    };

    for (let i = 0; i < dto.sales.length; i++) {
      const saleData = dto.sales[i];
      try {
        this.logger.log(
          `📦 Procesando venta ${i + 1}/${dto.sales.length}: ${saleData.excelCode}`,
        );

        const sale = await this.importSingleSale(saleData, dto.vendorId);

        results.success++;
        results.salesCreated.push({
          excelCode: saleData.excelCode,
          saleId: sale.id,
          lotName: saleData.lot.name,
          clientDocument: saleData.client.lead.document,
        });

        this.logger.log(`✅ Venta ${saleData.excelCode} creada exitosamente`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          excelCode: saleData.excelCode,
          error: error.message,
          stack: error.stack,
        });

        this.logger.error(
          `❌ Error al importar venta ${saleData.excelCode}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `✨ Importación finalizada: ${results.success} éxitos, ${results.failed} errores`,
    );

    return results;
  }

  /**
   * Importar una sola venta con todas sus relaciones
   */
  private async importSingleSale(
    data: SaleImportDto,
    vendorId: string,
  ): Promise<Sale> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Crear/buscar jerarquía de proyecto
      const lot = await this.findOrCreateLot(data, manager);

      // 2. Crear/buscar lead y cliente principal
      const client = await this.findOrCreateClient(data.client, vendorId, manager);

      // 3. Crear/buscar cliente secundario (opcional)
      let secondaryClient: SecondaryClient | null = null;
      if (data.secondaryClient) {
        secondaryClient = await this.findOrCreateSecondaryClient(
          data.secondaryClient,
          manager,
        );
      }

      // 4. Crear venta
      const sale = await this.createSale(data, lot, client, vendorId, manager);

      // 5. Asociar cliente secundario a la venta (si existe)
      if (secondaryClient) {
        await this.associateSecondaryClientToSale(sale, secondaryClient, manager);
      }

      // 6. Crear financiamiento y cuotas
      const { financing } = await this.createFinancing(data, sale, manager);

      // 7. Crear pagos y detalles
      await this.createPayments(data, sale, financing, vendorId, manager);

      // 8. Actualizar montos de reserva (si aplica)
      await this.updateReservationAmounts(sale.id, manager);

      // 9. Actualizar montos de financiamiento (inicial pagado/pendiente)
      await this.updateFinancingAmounts(financing.id, manager);

      // 10. Actualizar estados de cuotas
      await this.updateInstallmentsStatus(financing.id, manager);

      // 11. Actualizar montos y estado de venta
      await this.updateSaleAmounts(sale.id, manager);

      return sale;
    });
  }

  /**
   * Buscar o crear jerarquía completa: Project → Stage → Block → Lot
   */
  private async findOrCreateLot(
    data: SaleImportDto,
    manager: EntityManager,
  ): Promise<Lot> {
    // 1. Buscar o crear proyecto
    let project = await manager.findOne(Project, {
      where: { name: data.project.name },
    });

    if (!project) {
      project = manager.create(Project, {
        name: data.project.name,
        currency: data.project.currency,
        isActive: true,
      });
      await manager.save(project);
      this.logger.log(`  📁 Proyecto creado: ${project.name}`);
    }

    // 2. Buscar o crear etapa
    let stage = await manager.findOne(Stage, {
      where: { name: data.stage.name, project: { id: project.id } },
      relations: ['project'],
    });

    if (!stage) {
      stage = manager.create(Stage, {
        name: data.stage.name,
        isActive: true,
        project: project,
      });
      await manager.save(stage);
      this.logger.log(`  📁 Etapa creada: ${stage.name}`);
    }

    // 3. Buscar o crear bloque
    let block = await manager.findOne(Block, {
      where: { name: data.block.name, stage: { id: stage.id } },
      relations: ['stage'],
    });

    if (!block) {
      block = manager.create(Block, {
        name: data.block.name,
        isActive: true,
        stage: stage,
      });
      await manager.save(block);
      this.logger.log(`  📁 Bloque creado: ${block.name}`);
    }

    // 4. Buscar o crear lote
    let lot = await manager.findOne(Lot, {
      where: { name: data.lot.name, block: { id: block.id } },
      relations: ['block'],
    });

    if (!lot) {
      lot = manager.create(Lot, {
        name: data.lot.name,
        area: data.lot.area,
        lotPrice: data.lot.lotPrice,
        urbanizationPrice: data.lot.urbanizationPrice,
        status: data.lot.status,
        currency: data.lot.currency,
        block: block,
      });
      await manager.save(lot);
      this.logger.log(`  📁 Lote creado: ${lot.name}`);
    } else {
      // Actualizar datos del lote si ya existe
      lot.area = data.lot.area;
      lot.lotPrice = data.lot.lotPrice;
      lot.urbanizationPrice = data.lot.urbanizationPrice;
      lot.status = data.lot.status;
      lot.currency = data.lot.currency;
      await manager.save(lot);
      this.logger.log(`  📁 Lote actualizado: ${lot.name}`);
    }

    return lot;
  }

  /**
   * Buscar o crear Lead y Client
   */
  private async findOrCreateClient(
    clientData: any,
    vendorId: string,
    manager: EntityManager,
  ): Promise<Client> {
    // 1. Buscar lead por documento
    let lead = await manager.findOne(Lead, {
      where: { document: clientData.lead.document },
    });

    if (!lead) {
      lead = manager.create(Lead, {
        firstName: clientData.lead.firstName,
        lastName: clientData.lead.lastName,
        document: clientData.lead.document,
        documentType: clientData.lead.documentType,
        email: clientData.lead.email || null,
        phone: clientData.lead.phone || null,
        age: clientData.lead.age || null,
        interestProjects: clientData.lead.interestProjects || [],
        isActive: true,
        isInOffice: false,
        vendor: { id: vendorId } as any,
        ubigeo: { id: '1502' } as any, // ✅ Ubigeo por defecto para migraciones (Chepén)
      });
      await manager.save(lead);
      this.logger.log(`  👤 Lead creado: ${lead.document}`);
    }

    // 2. Buscar o crear cliente
    let client = await manager.findOne(Client, {
      where: { lead: { id: lead.id } },
      relations: ['lead'],
    });

    if (!client) {
      client = manager.create(Client, {
        lead: lead,
        address: clientData.address || null,
        isActive: true,
      });
      await manager.save(client);
      this.logger.log(`  👤 Cliente creado para lead: ${lead.document}`);
    }

    return client;
  }

  /**
   * Buscar o crear SecondaryClient
   */
  private async findOrCreateSecondaryClient(
    secondaryClientData: any,
    manager: EntityManager,
  ): Promise<SecondaryClient> {
    let secondaryClient = await manager.findOne(SecondaryClient, {
      where: { document: secondaryClientData.document },
    });

    if (!secondaryClient) {
      secondaryClient = manager.create(SecondaryClient, {
        firstName: secondaryClientData.firstName,
        lastName: secondaryClientData.lastName,
        document: secondaryClientData.document,
        documentType: secondaryClientData.documentType,
        email: secondaryClientData.email || null,
        phone: secondaryClientData.phone || null,
        address: secondaryClientData.address || null,
      });
      await manager.save(secondaryClient);
      this.logger.log(`  👥 Cliente secundario creado: ${secondaryClient.document}`);
    }

    return secondaryClient;
  }

  /**
   * Asociar cliente secundario a la venta
   */
  private async associateSecondaryClientToSale(
    sale: Sale,
    secondaryClient: SecondaryClient,
    manager: EntityManager,
  ): Promise<void> {
    const association = manager.create(SecondaryClientSale, {
      sale: sale,
      secondaryClient: secondaryClient,
    });
    await manager.save(association);
    this.logger.log(`  👥 Cliente secundario asociado a venta`);
  }

  /**
   * Crear venta
   */
  private async createSale(
    data: SaleImportDto,
    lot: Lot,
    client: Client,
    vendorId: string,
    manager: EntityManager,
  ): Promise<Sale> {
    const sale = manager.create(Sale, {
      type: data.sale.saleType,
      contractDate: new Date(data.sale.contractDate),
      totalAmount: data.sale.totalAmount,
      totalAmountPaid: 0, // ✅ Se actualizará con pagos
      totalAmountPending: data.sale.totalAmount, // ✅ Pendiente = total
      totalAmountUrbanDevelopment: data.sale.totalAmountUrbanDevelopment,
      applyLateFee: data.sale.applyLateFee,
      metadata: {
        ...(data.sale.metadata || {}),
        'Fuente': 'Migración de Excel',
        'Codigo': data.excelCode,
      },
      notes: data.sale.notes || null,
      status: StatusSale.IN_PAYMENT_PROCESS, // Temporal, se actualizará después
      fromReservation: false,
      reservationAmountPaid: 0, // ✅ No hay reserva en migraciones
      reservationAmountPending: null, // ✅ No hay reserva
      lot: lot,
      client: client,
      vendor: { id: vendorId } as any,
    });

    await manager.save(sale);
    this.logger.log(`  💰 Venta creada: ${data.excelCode}`);

    return sale;
  }

  /**
   * Clasificar tipo de cuota 0 basado en observation
   */
  private classifyCuota0(observation?: string): 'reservation' | 'initial' {
    if (!observation) return 'initial';
    const upperObservation = observation.toUpperCase();
    if (upperObservation.includes('SEPARACION') || upperObservation.includes('SEPARACIÓN')) {
      return 'reservation';
    }
    if (upperObservation.includes('CANCELACION') || upperObservation.includes('CANCELACIÓN') || upperObservation.includes('CUOTA INICIAL')) {
      return 'initial';
    }
    return 'initial'; // Por defecto
  }

  /**
   * Crear financiamiento y cuotas
   */
  private async createFinancing(
    data: SaleImportDto,
    sale: Sale,
    manager: EntityManager,
  ): Promise<{ financing: Financing }> {
    // Solo procesar cuotas regulares (1, 2, 3... N)
    const regularInstallments = data.financing.installments.filter(
      (inst) => inst.couteNumber > 0,
    );

    // Actualizar Sale con reservationAmount si viene del Excel
    if (data.sale.reservationAmount && data.sale.reservationAmount > 0) {
      await manager.update(Sale, sale.id, {
        reservationAmount: data.sale.reservationAmount,
        reservationAmountPaid: 0,
        reservationAmountPending: data.sale.reservationAmount,
      });
      this.logger.log(`  💵 Reserva configurada: $${data.sale.reservationAmount}`);
    }

    // Crear financiamiento
    const financing = manager.create(Financing, {
      financingType: data.financing.financingType || FinancingType.CREDITO,
      initialAmount: data.financing.initialAmount,
      initialAmountPaid: 0,
      initialAmountPending: data.financing.initialAmount,
      interestRate: data.financing.interestRate || 0,
      quantityCoutes: regularInstallments.length,
      sale: sale,
    });

    await manager.save(financing);
    this.logger.log(
      `  🏦 Financiamiento creado - Inicial: $${data.financing.initialAmount}`,
    );

    // Crear cuotas regulares (1, 2, 3... N)
    for (const installmentData of regularInstallments) {
      const installment = manager.create(FinancingInstallments, {
        numberCuote: installmentData.couteNumber,
        couteAmount: installmentData.couteAmount,
        expectedPaymentDate: new Date(installmentData.expectedPaymentDate),
        lateFeeAmount: installmentData.lateFeeAmount,
        coutePaid: 0,
        coutePending: installmentData.couteAmount,
        lateFeeAmountPaid: 0,
        lateFeeAmountPending: installmentData.lateFeeAmount,
        status: StatusFinancingInstallments.PENDING,
        financing: financing,
      });

      await manager.save(installment);
    }

    this.logger.log(
      `  📋 ${regularInstallments.length} cuotas regulares creadas`,
    );

    return { financing };
  }

  /**
   * Crear pagos y detalles de pago
   */
  private async createPayments(
    data: SaleImportDto,
    sale: Sale,
    financing: Financing,
    vendorId: string,
    manager: EntityManager,
  ): Promise<void> {
    for (const paymentGroup of data.payments) {
      // Calcular monto total de los detalles
      const totalAmount = paymentGroup.paymentDetails.reduce(
        (sum, detail) => sum + detail.amount,
        0,
      );

      let relatedEntityType: string;
      let relatedEntityId: string;
      const observation = paymentGroup.observation || null;
      const numberTicket = paymentGroup.numberTicket || null;

      // Determinar tipo de pago
      if (paymentGroup.couteNumber === 0) {
        // Pago de cuota 0 → clasificar por observation
        const cuota0Type = this.classifyCuota0(observation);

        if (cuota0Type === 'reservation') {
          relatedEntityType = 'reservation';
          relatedEntityId = sale.id;
        } else {
          relatedEntityType = 'financing';
          relatedEntityId = financing.id;
        }
      } else {
        // ✅ UNIFORMIZADO: Pago de cuotas regulares → apunta al financing (NO a cuota individual)
        // El sistema distribuirá automáticamente el pago entre las cuotas pendientes
        relatedEntityType = 'financingInstallments';
        relatedEntityId = financing.id;
      }

      // Crear payment
      const payment = manager.create(Payment, {
        user: { id: vendorId } as any,
        paymentConfig: { id: paymentGroup.paymentConfigId } as any,
        amount: totalAmount,
        status: StatusPayment.APPROVED,
        methodPayment: MethodPayment.VOUCHER,
        relatedEntityType: relatedEntityType,
        relatedEntityId: relatedEntityId,
        observation: observation,
        numberTicket: numberTicket,
        metadata: {
          'Concepto de pago':
            paymentGroup.couteNumber === 0
              ? (relatedEntityType === 'reservation' ? 'Pago de reserva' : 'Pago de cuota inicial')
              : 'Pago de cuotas de financiación',
          'Migración histórica': true,
          'Cuota referencia Excel': paymentGroup.couteNumber > 0 ? paymentGroup.couteNumber : undefined,
        },
        reviewedBy: { id: vendorId } as any,
        reviewedAt: new Date(),
      });

      await manager.save(payment);

      // Crear detalles de pago
      for (const detailData of paymentGroup.paymentDetails) {
        const paymentDetail = manager.create(PaymentDetails, {
          payment: payment,
          amount: detailData.amount,
          bankName: detailData.bankName || null,
          transactionReference: detailData.transactionReference,
          codeOperation: detailData.transactionReference,
          transactionDate: new Date(detailData.transactionDate),
          url: detailData.url,
          urlKey: detailData.urlKey,
          isActive: true,
        });

        await manager.save(paymentDetail);
      }

      this.logger.log(
        `  💳 Pago creado ${paymentGroup.couteNumber === 0 ? 'inicial/reserva' : 'de cuotas'}: $${totalAmount}`,
      );
    }
  }

  /**
   * Actualizar estado de las cuotas según los pagos realizados
   * ✅ ENFOQUE INTERMEDIO: Pagos apuntan a financing, pero se aplican a cuota específica del Excel
   * NO hay distribución automática - cada pago va solo a su cuota asignada
   */
  private async updateInstallmentsStatus(
    financingId: string,
    manager: EntityManager,
  ): Promise<void> {
    // 1. Obtener cuotas ordenadas por número
    const installments = await manager.find(FinancingInstallments, {
      where: { financing: { id: financingId } },
      relations: ['financing'],
      order: { numberCuote: 'ASC' },
    });

    if (installments.length === 0) return;

    // 2. Obtener pagos aprobados del financiamiento ordenados cronológicamente
    const payments = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.relatedEntityType = :type', {
        type: 'financingInstallments',
      })
      .andWhere('payment.relatedEntityId = :id', { id: financingId })
      .andWhere('payment.status = :status', { status: StatusPayment.APPROVED })
      .orderBy('payment.createdAt', 'ASC')
      .getMany();

    // 3. Crear un mapa de acumulado de pagos por cuota (para calcular pendiente progresivo)
    const installmentPaidAccumulator = new Map<number, number>();

    // Inicializar acumuladores en 0
    for (const installment of installments) {
      installmentPaidAccumulator.set(installment.numberCuote, 0);
    }

    // 4. Procesar cada pago en orden cronológico
    for (const payment of payments) {
      const cuotaReferencia = payment.metadata?.['Cuota referencia Excel'];

      if (!cuotaReferencia) continue;

      const cuotaNumber = Number(cuotaReferencia);
      const installment = installments.find(inst => inst.numberCuote === cuotaNumber);

      if (!installment) continue;

      // Acumular el pago para esta cuota
      const currentPaid = installmentPaidAccumulator.get(cuotaNumber) || 0;
      const newPaid = currentPaid + Number(payment.amount);
      installmentPaidAccumulator.set(cuotaNumber, newPaid);

      // Calcular pendiente DESPUÉS de este pago específico
      const pendingAfterThisPayment = Number(
        (Number(installment.couteAmount) - newPaid).toFixed(2)
      );

      // Determinar modo basado en el pendiente después de este pago
      const mode = pendingAfterThisPayment <= 0 ? 'Total' : 'Parcial';

      // Actualizar metadata del pago con pendiente progresivo
      payment.metadata = {
        ...(payment.metadata || {}),
        'Cuotas afectadas': {
          [`Cuota ${installment.numberCuote}`]: {
            'Modo': mode,
            'Monto aplicado': Number(payment.amount),
            'Pendiente después de este pago': pendingAfterThisPayment > 0 ? pendingAfterThisPayment : 0,
          },
        },
      };
      await manager.save(payment);
    }

    // 5. Actualizar estados finales de las cuotas
    for (const installment of installments) {
      const totalPaid = installmentPaidAccumulator.get(installment.numberCuote) || 0;

      installment.coutePaid = Number(totalPaid.toFixed(2));
      installment.coutePending = Number(
        (Number(installment.couteAmount) - totalPaid).toFixed(2)
      );

      // Actualizar estado
      if (installment.coutePending <= 0) {
        installment.status = StatusFinancingInstallments.PAID;
      } else if (totalPaid > 0) {
        installment.status = StatusFinancingInstallments.PENDING;
      } else {
        installment.status = StatusFinancingInstallments.PENDING;
      }

      await manager.save(installment);
    }

    this.logger.log(`  ✅ Estados de ${installments.length} cuotas actualizados (aplicación directa según Excel)`);
  }

  /**
   * Actualizar montos de reserva (pagado/pendiente)
   */
  private async updateReservationAmounts(
    saleId: string,
    manager: EntityManager,
  ): Promise<void> {
    const sale = await manager.findOne(Sale, {
      where: { id: saleId },
    });

    if (!sale || !sale.reservationAmount) {
      return; // No hay reserva, no hacer nada
    }

    // Calcular pagos realizados a la reserva (relatedEntityType = 'reservation')
    const payments = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.relatedEntityType = :type', { type: 'reservation' })
      .andWhere('payment.relatedEntityId = :id', { id: saleId })
      .andWhere('payment.status = :status', { status: StatusPayment.APPROVED })
      .getMany();

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Number(sale.reservationAmount) - totalPaid;

    await manager.update(Sale, saleId, {
      reservationAmountPaid: Number(totalPaid.toFixed(2)),
      reservationAmountPending: Number((pending > 0 ? pending : 0).toFixed(2)),
    });

    this.logger.log(
      `  💵 Reserva actualizada - Pagado: $${totalPaid.toFixed(2)}, Pendiente: $${(pending > 0 ? pending : 0).toFixed(2)}`,
    );
  }

  /**
   * Actualizar montos de financiamiento (inicial pagado/pendiente)
   */
  private async updateFinancingAmounts(
    financingId: string,
    manager: EntityManager,
  ): Promise<void> {
    const financing = await manager.findOne(Financing, {
      where: { id: financingId },
    });

    if (!financing) {
      return;
    }

    // Calcular pagos realizados a la inicial (relatedEntityType = 'financing')
    const payments = await manager
      .createQueryBuilder(Payment, 'payment')
      .where('payment.relatedEntityType = :type', { type: 'financing' })
      .andWhere('payment.relatedEntityId = :id', { id: financingId })
      .andWhere('payment.status = :status', { status: StatusPayment.APPROVED })
      .getMany();

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Number(financing.initialAmount) - totalPaid;

    financing.initialAmountPaid = Number(totalPaid.toFixed(2));
    financing.initialAmountPending = Number((pending > 0 ? pending : 0).toFixed(2));

    await manager.save(financing);
    this.logger.log(
      `  💵 Financiamiento actualizado - Inicial pagado: $${financing.initialAmountPaid}, Pendiente: $${financing.initialAmountPending}`,
    );
  }

  /**
   * Actualizar montos y estado de la venta
   */
  private async updateSaleAmounts(
    saleId: string,
    manager: EntityManager,
  ): Promise<void> {
    const sale = await manager.findOne(Sale, {
      where: { id: saleId },
      relations: ['financing', 'financing.financingInstallments'],
    });

    if (!sale || !sale.financing) {
      return;
    }

    // Calcular total pagado: inicial + cuotas
    const initialPaid = Number(sale.financing.initialAmountPaid || 0);
    const installments = sale.financing.financingInstallments;
    const installmentsPaid = installments.reduce(
      (sum, inst) => sum + Number(inst.coutePaid || 0),
      0,
    );

    const totalPaid = Number((initialPaid + installmentsPaid).toFixed(2));
    const totalPending = Number((Number(sale.totalAmount) - totalPaid).toFixed(2));

    sale.totalAmountPaid = totalPaid;
    sale.totalAmountPending = totalPending > 0 ? totalPending : 0;

    // Determinar estado de la venta
    const allInstallmentsPaid = installments.every(
      (inst) => inst.status === StatusFinancingInstallments.PAID,
    );
    const initialFullyPaid =
      Number(sale.financing.initialAmountPending || 0) === 0;

    if (allInstallmentsPaid && initialFullyPaid) {
      sale.status = StatusSale.COMPLETED;
    } else {
      sale.status = StatusSale.IN_PAYMENT_PROCESS;
    }

    await manager.save(sale);
    this.logger.log(
      `  💰 Venta actualizada - Total pagado: $${sale.totalAmountPaid}, Pendiente: $${sale.totalAmountPending}, Estado: ${sale.status}`,
    );
  }

  /**
   * Actualizar estado de la venta según cuotas pagadas
   * @deprecated Use updateSaleAmounts instead
   */
  private async updateSaleStatus(
    saleId: string,
    manager: EntityManager,
  ): Promise<void> {
    const sale = await manager.findOne(Sale, {
      where: { id: saleId },
      relations: ['financing', 'financing.financingInstallments'],
    });

    if (!sale || !sale.financing) {
      return;
    }

    const installments = sale.financing.financingInstallments;
    const allPaid = installments.every(
      (inst) => inst.status === StatusFinancingInstallments.PAID,
    );

    if (allPaid) {
      sale.status = StatusSale.COMPLETED;
    } else {
      sale.status = StatusSale.IN_PAYMENT_PROCESS;
    }

    await manager.save(sale);
    this.logger.log(`  ✅ Estado de venta actualizado: ${sale.status}`);
  }

  // ========== MÉTODOS AUXILIARES PARA TRANSFORMACIÓN DE EXCEL ==========

  /**
   * Transformar grupo de filas del Excel a una venta
   */
  private async transformRowsToSale(excelCode: string, rows: any[]): Promise<any> {
    const firstRow = rows[0].row; // Usamos la primera fila para datos generales

    // Extraer datos generales de la venta (siempre en la primera fila)
    const project = {
      name: this.cleanString(firstRow[2]), // Col 02: Proyecto
      currency: this.mapCurrency(this.cleanString(firstRow[25])), // Col 25: MONEDA
    };

    const stage = {
      name: this.cleanString(firstRow[3]), // Col 03: Etapa
    };

    const block = {
      name: this.cleanString(firstRow[6]), // Col 06: Bloque
    };

    const lot = {
      name: this.cleanString(firstRow[7]), // Col 07: Lote
      area: this.cleanNumber(firstRow[8]), // Col 08: Área
      lotPrice: this.cleanAmount(firstRow[9]), // Col 09: Precio del Lote
      urbanizationPrice: this.cleanAmount(firstRow[10]), // Col 10: Precio de Urbanización
      status: LotStatus.SOLD, // Siempre vendido
      currency: this.mapCurrency(this.cleanString(firstRow[25])), // Col 25: MONEDA
    };

    // Cliente principal
    const clientFullName = this.cleanString(firstRow[14]); // Col 14: NOMBRE
    const clientNames = this.splitFullName(clientFullName);

    const client = {
      lead: {
        firstName: clientNames.firstName,
        lastName: clientNames.lastName,
        document: this.cleanString(firstRow[13]), // Col 13: DOCUMENTO
        documentType: this.mapDocumentType(this.cleanString(firstRow[12])), // Col 12: TIPO DE DOCUMENTO
        email: null,
        phone: null,
        age: null,
        interestProjects: [],
      },
      address: null,
    };

    // Cliente secundario (opcional)
    let secondaryClient = null;
    const secondaryDocument = this.cleanString(firstRow[16]); // Col 16: DOCUMENTO secundario

    if (secondaryDocument) {
      const secondaryFullName = this.cleanString(firstRow[17]); // Col 17: NOMBRE secundario
      const secondaryNames = this.splitFullName(secondaryFullName);

      secondaryClient = {
        firstName: secondaryNames.firstName,
        lastName: secondaryNames.lastName,
        document: secondaryDocument,
        documentType: this.mapDocumentType(this.cleanString(firstRow[15])), // Col 15: TIPO DOC secundario
        email: null,
        phone: null,
        address: null,
      };
    }

    // Venta
    const totalAmount = this.cleanAmount(firstRow[26]); // Col 26: PRECIO
    const contractDate = this.parseExcelDate(firstRow[24]); // Col 24: FECHA DE CONTRATO

    // Procesar todas las filas para obtener cuotas, pagos, reserva e inicial
    const { installments, payments, reservationAmount, initialAmount } = this.processInstallmentsAndPayments(rows);

    const sale = {
      saleType: SaleType.FINANCED, // Siempre financiamiento
      contractDate: contractDate,
      totalAmount: totalAmount,
      totalAmountUrbanDevelopment: 0, // No hay HU en el Excel
      applyLateFee: false, // Se calculará después
      reservationAmount: reservationAmount > 0 ? reservationAmount : null, // ✅ Solo si hay SEPARACION
      metadata: {},
      notes: null,
    };

    const financing = {
      financingType: FinancingType.CREDITO, // ✅ Siempre CREDITO para ventas con cuotas
      initialAmount: initialAmount, // ✅ Calculado desde cuotas 0 tipo CANCELACION
      interestRate: 0, // ✅ 0 por defecto (no está en Excel)
      quantityCoutes: installments.length, // Derivado del número real de cuotas procesadas
      installments: installments, // ✅ Sin cuotas 0
    };

    return {
      excelCode,
      project,
      stage,
      block,
      lot,
      client,
      secondaryClient,
      sale,
      financing,
      payments,
    };
  }

  /**
   * Procesar cuotas y pagos de todas las filas
   */
  private processInstallmentsAndPayments(rows: any[]): {
    installments: any[];
    payments: any[];
    reservationAmount: number;
    initialAmount: number;
  } {
    const installmentsArray: any[] = []; // Array de cuotas regulares
    const paymentsArray: any[] = []; // Array de pagos (con índice de fila)
    let reservationAmount = 0;
    let initialAmount = 0;

    // ========== PROCESAR TODAS LAS FILAS ==========
    for (let i = 0; i < rows.length; i++) {
      const { row } = rows[i];
      const couteNumberExcel = this.cleanNumber(row[28]); // Col 28: CUOTA (del Excel) - solo para detectar cuota 0
      const couteAmount = this.cleanAmount(row[30]); // Col 30: IMPORTE DE CUOTA
      const expectedPaymentDate = this.parseExcelDate(row[29]); // Col 29: FECHA DE VENCIMIENTO
      const lateFeeAmount = this.cleanAmount(row[31]); // Col 31: MORA
      const detalle = this.cleanString(row[39]) || this.cleanString(row[47]); // Col 39 o 47: DETALLE
      const numberTicket = this.cleanString(row[36]); // Col 36: NUMERO (primera columna NUMERO)

      // ========== CLASIFICAR CUOTA 0 ==========
      if (couteNumberExcel === 0) {
        const cuota0Type = this.classifyCuota0(detalle);

        if (cuota0Type === 'reservation') {
          reservationAmount += couteAmount;
        } else {
          initialAmount += couteAmount;
        }

        // ✅ Procesar pagos de cuota 0
        const paymentDetails = this.extractPaymentDetails(row);

        if (paymentDetails.length > 0) {
          paymentsArray.push({
            rowIndex: i, // ✅ Índice de fila
            couteNumber: 0, // ✅ Cuota 0 mantiene su número
            paymentConfigId: cuota0Type === 'reservation' ? 2 : 3,
            paymentDetails,
            observation: detalle,
            numberTicket: numberTicket, // ✅ Número de ticket del Excel
          });
        }

        continue; // ✅ NO agregar cuota 0 a installments
      }

      // ========== CUOTAS REGULARES (1, 2, 3... N) ==========
      // Agregar cuota regular con su índice de fila
      installmentsArray.push({
        rowIndex: i, // ✅ Índice de fila para asociar con pagos
        couteAmount,
        expectedPaymentDate,
        lateFeeAmount,
      });

      // Procesar pagos de cuotas regulares
      const paymentDetails = this.extractPaymentDetails(row);

      if (paymentDetails.length > 0) {
        paymentsArray.push({
          rowIndex: i, // ✅ Índice de fila para asociar con cuota
          paymentConfigId: 4, // FINANCING_INSTALLMENTS_PAYMENT
          paymentDetails,
          observation: detalle,
          numberTicket: numberTicket, // ✅ Número de ticket del Excel
        });
      }
    }

    // ========== RENUMERAR CUOTAS SECUENCIALMENTE ==========
    // Crear mapeo: índice de fila → número de cuota secuencial
    const rowIndexToSequentialNumber = new Map<number, number>();

    installmentsArray.forEach((inst, index) => {
      const sequentialNumber = index + 1; // 1, 2, 3...
      rowIndexToSequentialNumber.set(inst.rowIndex, sequentialNumber);
    });

    // Crear cuotas con número secuencial
    const renumberedInstallments = installmentsArray.map((inst, index) => ({
      couteNumber: index + 1, // ✅ Número secuencial
      couteAmount: inst.couteAmount,
      expectedPaymentDate: inst.expectedPaymentDate,
      lateFeeAmount: inst.lateFeeAmount,
    }));

    // ========== ASOCIAR PAGOS CON NÚMEROS DE CUOTA CORRECTOS ==========
    const updatedPayments = paymentsArray.map((payment) => {
      if (payment.couteNumber === 0) {
        // Cuota 0: ya tiene el número correcto
        const { rowIndex, ...cleanPayment } = payment;
        return cleanPayment;
      } else {
        // Cuotas regulares: obtener número secuencial por índice de fila
        const sequentialNumber = rowIndexToSequentialNumber.get(payment.rowIndex);
        const { rowIndex, ...cleanPayment } = payment;

        return {
          ...cleanPayment,
          couteNumber: sequentialNumber, // ✅ Número secuencial asignado
        };
      }
    });

    return {
      installments: renumberedInstallments, // ✅ Cuotas renumeradas (1, 2, 3...)
      payments: updatedPayments, // ✅ Pagos asociados correctamente
      reservationAmount,
      initialAmount,
    };
  }

  /**
   * Extraer detalles de pago (abonos) de una fila
   */
  private extractPaymentDetails(row: any): any[] {
    const details = [];
    const voucherUrl = 'https://firebasestorage.googleapis.com/v0/b/test-project-3657a.appspot.com/o/huertas%2Fvoucher-migracion.png?alt=media&token=3fa1f499-cb83-41cb-92e4-441ebe529824';
    const voucherKey = 'huertas/voucher-migracion.png';

    // Procesar hasta 8 grupos de abonos (cols 48-95, cada 6 columnas)
    for (let i = 0; i < 8; i++) {
      const baseCol = 48 + (i * 6); // 48, 54, 60, 66, 72, 78, 84, 90

      const transactionDate = this.parseExcelDate(row[baseCol]); // Col 48/54/60...: FECHA DE ABONO
      const transactionReference = this.cleanString(row[baseCol + 1]); // Col 49/55/61...: NUMERO DE OPERACIÓN
      const amountPEN = this.cleanAmount(row[baseCol + 2]); // Col 50/56/62...: ABONADO S/
      const amountUSD = this.cleanAmount(row[baseCol + 4]); // Col 52/58/64...: ABONADO $

      const amount = amountUSD > 0 ? amountUSD : amountPEN;

      if (amount > 0 && transactionReference) {
        details.push({
          bankName: null,
          transactionReference,
          transactionDate,
          amount,
          url: voucherUrl,
          urlKey: voucherKey,
        });
      }
    }

    return details;
  }

  // ========== MÉTODOS AUXILIARES DE LIMPIEZA Y CONVERSIÓN ==========

  private cleanString(value: any): string | null {
    if (!value) return null;
    return String(value).trim();
  }

  private cleanNumber(value: any): number {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private cleanAmount(value: any): number {
    if (!value) return 0;
    const str = String(value);
    const cleaned = str.replace(/[$S\/\s,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private parseExcelDate(value: any): string {
    if (!value) return new Date().toISOString().split('T')[0];

    // Si es un número (serial de Excel)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const days = Math.floor(value);
      const milliseconds = days * 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + milliseconds);
      return date.toISOString().split('T')[0];
    }

    // Si ya es una fecha o string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  }

  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    if (!fullName) return { firstName: '', lastName: '' };

    const parts = fullName.trim().split(/\s+/);

    if (parts.length <= 2) {
      return {
        firstName: parts[0] || '',
        lastName: parts[1] || '',
      };
    }

    const firstName = parts.slice(0, 2).join(' ');
    const lastName = parts.slice(2).join(' ');

    return { firstName, lastName };
  }

  private mapCurrency(value: string): 'USD' | 'PEN' {
    if (!value) return 'PEN';
    const upper = value.toUpperCase();
    if (upper.includes('DOLAR') || upper.includes('USD')) return 'USD';
    return 'PEN';
  }

  private mapDocumentType(value: string): 'DNI' | 'CE' | 'RUC' {
    if (!value) return 'DNI';
    const upper = value.toUpperCase();
    if (upper.includes('CE')) return 'CE';
    if (upper.includes('RUC')) return 'RUC';
    return 'DNI';
  }
}
