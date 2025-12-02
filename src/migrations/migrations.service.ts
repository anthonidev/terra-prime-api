import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

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
    private readonly dataSource: DataSource,
  ) {}

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
      const { financing, installmentMap } = await this.createFinancing(data, sale, manager);

      // 7. Crear pagos y detalles
      await this.createPayments(data, sale, financing, installmentMap, vendorId, manager);

      // 8. Actualizar estados de cuotas y venta
      await this.updateInstallmentsStatus(financing.id, manager);
      await this.updateSaleStatus(sale.id, manager);

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
      totalAmountUrbanDevelopment: data.sale.totalAmountUrbanDevelopment,
      applyLateFee: data.sale.applyLateFee,
      metadata: data.sale.metadata || {},
      notes: data.sale.notes || null,
      status: StatusSale.IN_PAYMENT_PROCESS, // Temporal, se actualizará después
      fromReservation: false,
      lot: lot,
      client: client,
      vendor: { id: vendorId } as any,
    });

    await manager.save(sale);
    this.logger.log(`  💰 Venta creada: ${data.excelCode}`);

    return sale;
  }

  /**
   * Crear financiamiento y cuotas
   */
  private async createFinancing(
    data: SaleImportDto,
    sale: Sale,
    manager: EntityManager,
  ): Promise<{ financing: Financing; installmentMap: Map<number, string> }> {
    // Separar cuotas 0 (inicial) de las cuotas regulares
    const initialInstallments = data.financing.installments.filter(
      (inst) => inst.couteNumber === 0,
    );
    const regularInstallments = data.financing.installments.filter(
      (inst) => inst.couteNumber > 0,
    );

    // Calcular monto inicial sumando todas las cuotas 0
    const calculatedInitialAmount = initialInstallments.reduce(
      (sum, inst) => sum + inst.couteAmount,
      0,
    );

    // Crear financiamiento
    const financing = manager.create(Financing, {
      financingType: data.financing.financingType,
      initialAmount: calculatedInitialAmount, // ✅ Suma de cuotas 0
      interestRate: data.financing.interestRate || null,
      quantityCoutes: regularInstallments.length, // ✅ Solo cuotas regulares
      sale: sale,
    });

    await manager.save(financing);
    this.logger.log(
      `  🏦 Financiamiento creado - Inicial: $${calculatedInitialAmount}`,
    );

    // Ordenar cuotas regulares por fecha de vencimiento
    const sortedInstallments = [...regularInstallments].sort(
      (a, b) =>
        new Date(a.expectedPaymentDate).getTime() -
        new Date(b.expectedPaymentDate).getTime(),
    );

    // Crear solo cuotas regulares (1, 2, 3... N) y mapear número de cuota → ID
    const installmentMap = new Map<number, string>();

    for (const installmentData of sortedInstallments) {
      const installment = manager.create(FinancingInstallments, {
        couteAmount: installmentData.couteAmount,
        expectedPaymentDate: new Date(installmentData.expectedPaymentDate),
        lateFeeAmount: installmentData.lateFeeAmount,
        coutePaid: 0, // Se actualizará con los pagos
        coutePending: installmentData.couteAmount,
        lateFeeAmountPaid: 0,
        lateFeeAmountPending: installmentData.lateFeeAmount,
        status: StatusFinancingInstallments.PENDING, // Se actualizará después
        financing: financing,
      });

      const savedInstallment = await manager.save(installment);

      // Guardar mapeo: número de cuota del Excel → ID de la cuota creada
      installmentMap.set(installmentData.couteNumber, savedInstallment.id);
    }

    this.logger.log(
      `  📋 ${regularInstallments.length} cuotas regulares creadas (sin contar inicial)`,
    );

    return { financing, installmentMap };
  }

  /**
   * Crear pagos y detalles de pago
   */
  private async createPayments(
    data: SaleImportDto,
    sale: Sale,
    financing: Financing,
    installmentMap: Map<number, string>,
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

      // Determinar si es pago de inicial (cuota 0) o pago de cuota regular
      if (paymentGroup.couteNumber === 0) {
        // ✅ Pago de inicial → va al financing directamente
        relatedEntityType = 'financing';
        relatedEntityId = financing.id;
      } else {
        // ✅ Pago de cuota regular → va a la cuota específica
        const installmentId = installmentMap.get(paymentGroup.couteNumber);

        if (!installmentId) {
          throw new BadRequestException(
            `Cuota ${paymentGroup.couteNumber} no encontrada en el mapeo`,
          );
        }

        relatedEntityType = 'financingInstallment';
        relatedEntityId = installmentId;
      }

      // Crear payment
      const payment = manager.create(Payment, {
        user: { id: vendorId } as any,
        paymentConfig: { id: paymentGroup.paymentConfigId } as any,
        amount: totalAmount,
        status: StatusPayment.APPROVED, // ✅ Directo aprobado
        methodPayment: MethodPayment.VOUCHER,
        relatedEntityType: relatedEntityType,
        relatedEntityId: relatedEntityId,
        metadata: {
          'Concepto de pago':
            paymentGroup.couteNumber === 0
              ? 'Pago de cuota inicial'
              : `Pago de cuota ${paymentGroup.couteNumber}`,
          'Migración histórica': true,
        },
        codeOperation: paymentGroup.paymentDetails[0]?.transactionReference || null,
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
          transactionDate: new Date(detailData.transactionDate),
          url: detailData.url,
          urlKey: detailData.urlKey,
          isActive: true,
        });

        await manager.save(paymentDetail);
      }

      this.logger.log(
        `  💳 Pago creado para cuota ${paymentGroup.couteNumber}: $${totalAmount}`,
      );
    }
  }

  /**
   * Actualizar estado de las cuotas según los pagos realizados
   */
  private async updateInstallmentsStatus(
    financingId: string,
    manager: EntityManager,
  ): Promise<void> {
    const installments = await manager.find(FinancingInstallments, {
      where: { financing: { id: financingId } },
      relations: ['financing'],
    });

    for (const installment of installments) {
      // Calcular pagos realizados para esta cuota
      const payments = await manager
        .createQueryBuilder(Payment, 'payment')
        .where('payment.relatedEntityType = :type', {
          type: 'financingInstallment',
        })
        .andWhere('payment.relatedEntityId = :id', { id: installment.id })
        .andWhere('payment.status = :status', { status: StatusPayment.APPROVED })
        .getMany();

      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const pending = Number(installment.couteAmount) - totalPaid;

      installment.coutePaid = totalPaid;
      installment.coutePending = pending > 0 ? pending : 0;

      // Actualizar estado
      if (pending <= 0) {
        installment.status = StatusFinancingInstallments.PAID;
      } else if (totalPaid > 0) {
        installment.status = StatusFinancingInstallments.PENDING;
      } else if (new Date(installment.expectedPaymentDate) < new Date()) {
        installment.status = StatusFinancingInstallments.PENDING;
      } else {
        installment.status = StatusFinancingInstallments.PENDING;
      }

      await manager.save(installment);
    }

    this.logger.log(`  ✅ Estados de cuotas actualizados`);
  }

  /**
   * Actualizar estado de la venta según cuotas pagadas
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
}
