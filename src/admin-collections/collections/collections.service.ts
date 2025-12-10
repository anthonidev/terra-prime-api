import { Body, Injectable, Post } from '@nestjs/common';
import { ClientsService } from 'src/admin-sales/clients/clients.service';
import { AssignClientsToCollectorDto } from 'src/admin-sales/clients/dto/assign-clients-to-collector.dto';
import { formatClientResponse } from 'src/admin-sales/clients/helpers/format-client-response.helper';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/user.service';
import { AllCollectorsActivesResponse } from './interfaces/all-collectors-actives-response.interface';
import { formatFindAllCollectors } from './helpers/format-find-all-collectors.helper';
import { Paginated } from 'src/common/interfaces/paginated.interface';
import { PaginationDto } from 'src/common/dto/paginationDto';
import { PaginationHelper } from 'src/common/helpers/pagination.helper';
import { ClientResponse } from 'src/admin-sales/clients/interfaces/client-response.interface';
import { SalesService } from 'src/admin-sales/sales/sales.service';
import { SaleResponse } from 'src/admin-sales/sales/interfaces/sale-response.interface';
import { FinancingInstallmentsService } from 'src/admin-sales/financing/services/financing-installments.service';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateDetailPaymentDto } from 'src/admin-payments/payments/dto/create-detail-payment.dto';
import { PaymentResponse } from 'src/admin-payments/payments/interfaces/payment-response.interface';
import { UrbanDevelopment } from '../../admin-sales/urban-development/entities/urban-development.entity';
import { UrbanDevelopmentService } from 'src/admin-sales/urban-development/urban-development.service';
import { SaleDetailCollectionResponse } from './interfaces/sale-detail-collection-response.interface';
import { formatHuInstallmentsResponse } from './helpers/format-hu-installments-response.helper';
import { FindPaymentsDto } from 'src/admin-payments/payments/dto/find-payments.dto';
import { PaymentAllResponse } from 'src/admin-payments/payments/interfaces/payment-all-response.interface';
import { PaymentsService } from 'src/admin-payments/payments/services/payments.service';
import { CollectorStatisticsFiltersDto } from './dto/collector-statistics-filters.dto';
import { CollectorStatisticsResponse } from './interfaces/collector-statistics-response.interface';
import { ClientCollectionResponse } from './interfaces/client-collection-response.interface';
import { ClientFiltersDto } from './dto/client-filters.dto';
import { UbigeoService } from 'src/lead/services/ubigeo.service';
import { SalesByClientResponse } from './interfaces/sales-by-client-response.interface';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly clientService: ClientsService,
    private readonly userService: UsersService,
    private readonly saleService: SalesService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
    private readonly paymentsService: PaymentsService,
    private readonly ubigeoService: UbigeoService,
    private readonly dataSource: DataSource,
  ) {}

  async assignClientsToCollector(
    assignClientsToCollectorDto: AssignClientsToCollectorDto,
  ) {
    const clients = await this.clientService.assignClientsToCollector(
      assignClientsToCollectorDto.clientsId,
      assignClientsToCollectorDto.collectorId,
    );
    return clients.map(formatClientResponse);
  }

  async findAllCollectors(
    paginationDto: PaginationDto,
  ): Promise<Paginated<AllCollectorsActivesResponse>> {
    const collectors = await this.userService.findAllCollectors();
    return PaginationHelper.createPaginatedResponse(
      collectors.map(formatFindAllCollectors),
      collectors.length,
      paginationDto,
    );
  }

  async findAllClientsByUser(
    userId: string,
    filters?: ClientFiltersDto,
  ): Promise<Paginated<ClientCollectionResponse>> {
    const {
      departamentoId,
      provinciaId,
      distritoId,
      search,
      page = 1,
      limit = 10,
      ...paginationDto
    } = filters;
    const { clients, total } = await this.clientService.findAllByUser(
      userId,
      departamentoId,
      provinciaId,
      distritoId,
      search,
      page,
      limit,
    );

    // Obtener IDs de clientes con mora activa (cuotas con lateFeeAmount > 0)
    const clientsWithLatePayment = await this.dataSource.query(
      `
      SELECT DISTINCT c.id
      FROM clients c
      INNER JOIN sales s ON s."clientId" = c.id
      LEFT JOIN financing f ON s.financing_id = f.id
      LEFT JOIN financing_installments fi ON fi."financingId" = f.id
      LEFT JOIN urban_development ud ON ud.sale_id = s.id
      LEFT JOIN financing fhu ON ud.financing_id = fhu.id
      LEFT JOIN financing_installments fihu ON fihu."financingId" = fhu.id
      WHERE c.collector_id = $1
        AND (
          (fi."lateFeeAmount" > 0 AND fi.status IN ('PENDING', 'EXPIRED'))
          OR (fihu."lateFeeAmount" > 0 AND fihu.status IN ('PENDING', 'EXPIRED'))
        )
      `,
      [userId],
    );

    const clientIdsWithLatePayment = new Set(
      clientsWithLatePayment.map((row: any) => row.id),
    );

    const clientsFormatted = clients.map(formatClientResponse).map((client) => {
      const { collector, ...rest } = client;
      return {
        ...rest,
        hasActiveLatePayment: clientIdsWithLatePayment.has(client.id),
      };
    });

    return PaginationHelper.createPaginatedResponse(clientsFormatted, total, {
      ...paginationDto,
      page,
      limit,
    });
  }

  async findAllClientsWithCollection(
    filters: ClientFiltersDto,
  ): Promise<Paginated<ClientCollectionResponse>> {
    const {
      departamentoId,
      provinciaId,
      distritoId,
      collectorId,
      search,
      page = 1,
      limit = 20,
      ...paginationDto
    } = filters;
    console.log('Filters received:', filters);
    const { clients, total } =
      await this.clientService.findAllClientsWithCollection(
        departamentoId,
        provinciaId,
        distritoId,
        collectorId,
        search,
        page,
        limit,
      );

    // Obtener IDs de clientes con mora activa (cuotas con lateFeeAmount > 0)
    const clientsWithLatePayment = await this.dataSource.query(
      `
      SELECT DISTINCT c.id
      FROM clients c
      INNER JOIN sales s ON s."clientId" = c.id
      LEFT JOIN financing f ON s.financing_id = f.id
      LEFT JOIN financing_installments fi ON fi."financingId" = f.id
      LEFT JOIN urban_development ud ON ud.sale_id = s.id
      LEFT JOIN financing fhu ON ud.financing_id = fhu.id
      LEFT JOIN financing_installments fihu ON fihu."financingId" = fhu.id
      WHERE (
        (fi."lateFeeAmount" > 0 AND fi.status IN ('PENDING', 'EXPIRED'))
        OR (fihu."lateFeeAmount" > 0 AND fihu.status IN ('PENDING', 'EXPIRED'))
      )
      `,
    );

    const clientIdsWithLatePayment = new Set(
      clientsWithLatePayment.map((row: any) => row.id),
    );

    const clientsFormatted = clients
      .map(formatClientResponse)
      .map((client) => ({
        ...client,
        hasActiveLatePayment: clientIdsWithLatePayment.has(client.id),
      }));

    return PaginationHelper.createPaginatedResponse(clientsFormatted, total, {
      ...paginationDto,
      page,
      limit,
    });
  }

  async findAllSalesByClient(clientId: number): Promise<SalesByClientResponse> {
    // Obtener cliente con información completa incluyendo ubigeo
    const client = await this.clientService.findOneClientById(clientId);

    // Obtener ventas del cliente
    const sales = await this.saleService.findAllByClient(clientId);

    // Formatear ubigeo
    const getUbigeoFromLead = (lead: any) => {
      if (!lead?.ubigeo) return null;

      const ubigeo = lead.ubigeo;

      // Si no tiene padre, es un departamento
      if (!ubigeo.parent && !ubigeo.parentId) {
        return {
          departamento: ubigeo.name,
          provincia: null,
          distrito: null,
        };
      }

      // Si tiene padre pero el padre no tiene padre, es una provincia
      if (ubigeo.parent && !ubigeo.parent.parent && !ubigeo.parent.parentId) {
        return {
          departamento: ubigeo.parent.name,
          provincia: ubigeo.name,
          distrito: null,
        };
      }

      // Si tiene padre y el padre tiene padre, es un distrito
      if (ubigeo.parent && ubigeo.parent.parent) {
        return {
          departamento: ubigeo.parent.parent.name,
          provincia: ubigeo.parent.name,
          distrito: ubigeo.name,
        };
      }

      // Fallback usando el código de ubigeo
      const codeLength = ubigeo.code?.length || 0;

      if (codeLength === 2) {
        return {
          departamento: ubigeo.name,
          provincia: null,
          distrito: null,
        };
      } else if (codeLength === 4) {
        return {
          departamento: ubigeo.parent?.name || null,
          provincia: ubigeo.name,
          distrito: null,
        };
      } else if (codeLength === 6) {
        return {
          departamento:
            ubigeo.parent?.parent?.name || ubigeo.parent?.name || null,
          provincia: ubigeo.parent?.name || null,
          distrito: ubigeo.name,
        };
      }

      return {
        departamento: ubigeo.parent?.name || ubigeo.name,
        provincia: ubigeo.parentId ? ubigeo.name : null,
        distrito: null,
      };
    };

    // Formatear response
    return {
      client: {
        id: client.id,
        address: client.address,
        firstName: client.lead.firstName,
        lastName: client.lead.lastName,
        phone: client.lead.phone,
        document: client.lead.document,
        documentType: client.lead.documentType,
        age: client.lead.age,
        ubigeo: getUbigeoFromLead(client.lead),
        reportPdfUrl: null,
      },
      items: sales.map((sale) => ({
        id: sale.id,
        type: sale.type,
        totalAmount: sale.totalAmount?.toString(),
        status: sale.status,
        createdAt: sale.createdAt,
        currency: sale.currency,
        lot: {
          id: sale.lot.id,
          name: sale.lot.name,
          block: sale.lot.block,
          stage: sale.lot.stage,
          project: sale.lot.project,
        },
        radicationPdfUrl: sale.radicationPdfUrl,
        paymentAcordPdfUrl: sale.paymentAcordPdfUrl,
        financing: sale.financing
          ? {
              id: sale.financing.id,
              initialAmount: sale.financing.initialAmount?.toString(),
              interestRate: sale.financing.interestRate?.toString(),
              quantityCoutes: sale.financing.quantityCoutes?.toString(),
            }
          : null,
        vendor: {
          document: sale.vendor.document,
          firstName: sale.vendor.firstName,
          lastName: sale.vendor.lastName,
        },
      })),
    };
  }

  async findOneSaleByIdForClient(
    saleId: string,
  ): Promise<SaleDetailCollectionResponse> {
    // Obtener la venta raw con todas las relaciones
    const saleRaw = await this.dataSource
      .getRepository('Sale')
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('client.lead', 'lead')
      .leftJoinAndSelect('lead.ubigeo', 'ubigeo')
      .leftJoinAndSelect('ubigeo.parent', 'ubigeoParent')
      .leftJoinAndSelect('ubigeoParent.parent', 'ubigeoGrandParent')
      .leftJoinAndSelect('sale.vendor', 'vendor')
      .leftJoinAndSelect('sale.lot', 'lot')
      .leftJoinAndSelect('lot.block', 'block')
      .leftJoinAndSelect('block.stage', 'stage')
      .leftJoinAndSelect('stage.project', 'project')
      .leftJoinAndSelect('sale.guarantor', 'guarantor')
      .leftJoinAndSelect('sale.secondaryClientSales', 'secondaryClientSales')
      .leftJoinAndSelect(
        'secondaryClientSales.secondaryClient',
        'secondaryClient',
      )
      .leftJoinAndSelect('sale.financing', 'financing')
      .leftJoinAndSelect(
        'financing.financingInstallments',
        'financingInstallments',
      )
      .where('sale.id = :saleId', { saleId })
      .getOne();

    if (!saleRaw) {
      throw new Error('Venta no encontrada');
    }

    const urbanDevelopment =
      await this.urbanDevelopmentService.findOneBySaleId(saleId);

    const client = saleRaw.client;

    // Formatear ubigeo (reutilizando lógica anterior)
    const getUbigeoFromLead = (lead: any) => {
      if (!lead?.ubigeo) return null;
      const ubigeo = lead.ubigeo;

      if (!ubigeo.parent && !ubigeo.parentId) {
        return { departamento: ubigeo.name, provincia: null, distrito: null };
      }
      if (ubigeo.parent && !ubigeo.parent.parent && !ubigeo.parent.parentId) {
        return {
          departamento: ubigeo.parent.name,
          provincia: ubigeo.name,
          distrito: null,
        };
      }
      if (ubigeo.parent && ubigeo.parent.parent) {
        return {
          departamento: ubigeo.parent.parent.name,
          provincia: ubigeo.parent.name,
          distrito: ubigeo.name,
        };
      }

      const codeLength = ubigeo.code?.length || 0;
      if (codeLength === 2)
        return { departamento: ubigeo.name, provincia: null, distrito: null };
      if (codeLength === 4)
        return {
          departamento: ubigeo.parent?.name || null,
          provincia: ubigeo.name,
          distrito: null,
        };
      if (codeLength === 6)
        return {
          departamento:
            ubigeo.parent?.parent?.name || ubigeo.parent?.name || null,
          provincia: ubigeo.parent?.name || null,
          distrito: ubigeo.name,
        };

      return {
        departamento: ubigeo.parent?.name || ubigeo.name,
        provincia: ubigeo.parentId ? ubigeo.name : null,
        distrito: null,
      };
    };

    // Procesar cuotas de financiamiento sin pagos
    const financingInstallmentsWithPayments = saleRaw.financing
      ?.financingInstallments
      ? await Promise.all(
          saleRaw.financing.financingInstallments.map(async (installment) => ({
            id: installment.id,
            couteAmount: installment.couteAmount.toString(),
            coutePaid: installment.coutePaid,
            coutePending: installment.coutePending.toString(),
            expectedPaymentDate: installment.expectedPaymentDate,
            lateFeeAmountPending: installment.lateFeeAmountPending.toString(),
            lateFeeAmountPaid: installment.lateFeeAmountPaid,
            status: installment.status,
          })),
        )
      : [];

    // Procesar cuotas de habilitación urbana sin pagos
    let urbanDevelopmentFormatted = null;
    if (urbanDevelopment?.financing?.financingInstallments) {
      const huInstallmentsWithPayments = await Promise.all(
        urbanDevelopment.financing.financingInstallments.map(
          async (installment) => ({
            id: installment.id,
            couteAmount: installment.couteAmount.toString(),
            coutePaid: installment.coutePaid,
            coutePending: installment.coutePending.toString(),
            expectedPaymentDate: installment.expectedPaymentDate,
            lateFeeAmountPending: installment.lateFeeAmountPending.toString(),
            lateFeeAmountPaid: installment.lateFeeAmountPaid,
            status: installment.status,
          }),
        ),
      );

      urbanDevelopmentFormatted = {
        id: urbanDevelopment.id,
        amount: urbanDevelopment.amount.toString(),
        initialAmount: urbanDevelopment.initialAmount.toString(),
        status: urbanDevelopment.status,
        financing: {
          id: urbanDevelopment.financing.id,
          initialAmount: urbanDevelopment.financing.initialAmount.toString(),
          interestRate: urbanDevelopment.financing.interestRate.toString(),
          quantityCoutes: urbanDevelopment.financing.quantityCoutes.toString(),
          financingInstallments: huInstallmentsWithPayments,
        },
      };
    }

    // Obtener resumen de pagos
    const salePayments = await this.paymentsService.findPaymentsByRelatedEntity(
      'sale',
      saleId,
    );

    let financingPayments = [];
    if (saleRaw.financing) {
      financingPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financing',
          saleRaw.financing.id,
        );
    }

    let reservationPayments = [];
    if (saleRaw.reservationAmount > 0) {
      reservationPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'reservation',
          saleId,
        );
    }

    const installmentPayments = [];
    if (saleRaw.financing) {
      const financingInstallmentPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financingInstallments',
          saleRaw.financing.id,
        );
      installmentPayments.push(...financingInstallmentPayments);
    }

    if (urbanDevelopment?.financing) {
      const huInstallmentPayments =
        await this.paymentsService.findPaymentsByRelatedEntity(
          'financingInstallments',
          urbanDevelopment.financing.id,
        );
      installmentPayments.push(...huInstallmentPayments);
    }

    const allPayments = [
      ...salePayments,
      ...financingPayments,
      ...reservationPayments,
      ...installmentPayments,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const paymentsSummary = allPayments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      reviewedAt: payment.reviewedAt,
      codeOperation: payment.codeOperation,
      banckName: payment.banckName,
      dateOperation: payment.dateOperation,
      numberTicket: payment.numberTicket,
      paymentConfig: payment.paymentConfig.name,
      reason: payment?.rejectionReason ? payment.rejectionReason : null,
      metadata: payment.metadata,
    }));

    // Construir response
    return {
      client: {
        id: client.id,
        address: client.address,
        firstName: client.lead.firstName,
        lastName: client.lead.lastName,
        phone: client.lead.phone,
        document: client.lead.document,
        documentType: client.lead.documentType,
        age: client.lead.age,
        ubigeo: getUbigeoFromLead(client.lead),
        reportPdfUrl: null,
      },
      sale: {
        id: saleRaw.id,
        type: saleRaw.type,
        totalAmount: saleRaw.totalAmount.toString(),
        status: saleRaw.status,
        createdAt: saleRaw.createdAt.toISOString(),
        reservationAmount: saleRaw.reservationAmount?.toString() || null,
        maximumHoldPeriod: saleRaw.maximumHoldPeriod || null,
        fromReservation: saleRaw.fromReservation || false,
        currency: saleRaw.currency,
        guarantor: saleRaw.guarantor
          ? {
              id: saleRaw.guarantor.id,
              firstName: saleRaw.guarantor.firstName,
              lastName: saleRaw.guarantor.lastName,
              email: saleRaw.guarantor.email,
              phone: saleRaw.guarantor.phone,
              documentType: saleRaw.guarantor.documentType,
              document: saleRaw.guarantor.document,
            }
          : null,
        secondaryClients:
          saleRaw.secondaryClientSales?.map((scs) => ({
            firstName: scs.secondaryClient.firstName,
            lastName: scs.secondaryClient.lastName,
            email: scs.secondaryClient.email,
            phone: scs.secondaryClient.phone,
            documentType: scs.secondaryClient.documentType,
            document: scs.secondaryClient.document,
          })) || null,
        lot: {
          id: saleRaw.lot.id,
          name: saleRaw.lot.name,
          lotPrice: saleRaw.lot.lotPrice.toString(),
          block: saleRaw.lot.block.name,
          stage: saleRaw.lot.block.stage.name,
          project: saleRaw.lot.block.stage.project.name,
        },
        radicationPdfUrl: saleRaw.radicationPdfUrl,
        paymentAcordPdfUrl: saleRaw.paymentAcordPdfUrl,
        financing: saleRaw.financing
          ? {
              id: saleRaw.financing.id,
              initialAmount: saleRaw.financing.initialAmount.toString(),
              interestRate: saleRaw.financing.interestRate.toString(),
              quantityCoutes: saleRaw.financing.quantityCoutes.toString(),
              financingInstallments: financingInstallmentsWithPayments,
            }
          : null,
        urbanDevelopment: urbanDevelopmentFormatted,
        vendor: {
          document: saleRaw.vendor.document,
          firstName: saleRaw.vendor.firstName,
          lastName: saleRaw.vendor.lastName,
        },
      },
      paymentsSummary: paymentsSummary,
    };
  }

  async paidInstallments(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
  ): Promise<PaymentResponse> {
    return await this.financingInstallmentsService.payInstallments(
      financingId,
      amountPaid,
      paymentDetails,
      files,
      userId,
    );
  }

  async findAllPaymentsByCollector(
    filters: FindPaymentsDto,
    userId?: string,
  ): Promise<Paginated<PaymentAllResponse>> {
    return await this.paymentsService.findAllPayments(filters, userId);
  }

  async findOnePaymentByCollector(
    paymentId: number,
  ): Promise<PaymentAllResponse> {
    return await this.paymentsService.findOne(paymentId);
  }

  async getCollectorStatistics(
    filters: CollectorStatisticsFiltersDto,
  ): Promise<Paginated<CollectorStatisticsResponse>> {
    // Establecer mes y año por defecto (mes y año actual)
    const now = new Date();
    const month = filters.month ?? now.getMonth() + 1; // getMonth() retorna 0-11, necesitamos 1-12
    const year = filters.year ?? now.getFullYear();

    // Calcular primer y último día del mes
    const startDate = new Date(year, month - 1, 1); // Primer día del mes
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Último día del mes

    // Query para obtener todos los cobradores activos
    const collectors = await this.userService.findAllCollectors();

    // Procesar estadísticas para cada cobrador
    const statistics = await Promise.all(
      collectors.map(async (collector) => {
        // 1. Contar número de clientes asignados
        const clientCountResult = await this.dataSource.query(
          `
          SELECT COUNT(DISTINCT c.id) as count
          FROM clients c
          WHERE c.collector_id = $1
          `,
          [collector.id],
        );
        const numberOfClients = parseInt(clientCountResult[0]?.count || '0');

        // 2. Calcular montos recaudados (pagos aprobados/completados)
        const collectedAmountsResult = await this.dataSource.query(
          `
          SELECT
            p.currency as currency,
            COALESCE(SUM(pay.amount), 0) as total
          FROM payments pay
          LEFT JOIN financing f ON pay."relatedEntityId"::uuid = f.id
          LEFT JOIN sales s ON s.financing_id = f.id
          LEFT JOIN urban_development ud ON ud.financing_id = f.id
          LEFT JOIN sales s2 ON s2.id = ud.sale_id
          LEFT JOIN lots l ON COALESCE(s."lotId", s2."lotId") = l.id
          LEFT JOIN blocks b ON l."blockId" = b.id
          LEFT JOIN stages st ON b."stageId" = st.id
          LEFT JOIN projects p ON st."projectId" = p.id
          WHERE pay.user_id = $1
            AND pay.status IN ('APPROVED', 'COMPLETED')
            AND pay."createdAt" BETWEEN $2 AND $3
            AND pay."relatedEntityType" = 'financingInstallments'
          GROUP BY p.currency
          `,
          [collector.id, startDate, endDate],
        );

        let collectedAmountPEN = 0;
        let collectedAmountUSD = 0;

        collectedAmountsResult.forEach((row: any) => {
          const amount = parseFloat(row.total || '0');
          if (row.currency === 'PEN') {
            collectedAmountPEN = amount;
          } else if (row.currency === 'USD') {
            collectedAmountUSD = amount;
          }
        });

        // 3. Calcular montos por cobrar (cuotas del mes + deudas arrastradas de meses anteriores)
        const pendingAmountsResult = await this.dataSource.query(
          `
          SELECT
            p.currency as currency,
            COALESCE(SUM(fi."coutePending" + fi."lateFeeAmountPending"), 0) as total
          FROM clients c
          INNER JOIN sales s ON s."clientId" = c.id
          INNER JOIN lots l ON s."lotId" = l.id
          INNER JOIN blocks b ON l."blockId" = b.id
          INNER JOIN stages st ON b."stageId" = st.id
          INNER JOIN projects p ON st."projectId" = p.id
          LEFT JOIN financing f ON s.financing_id = f.id
          LEFT JOIN financing_installments fi ON fi."financingId" = f.id
          WHERE c.collector_id = $1
            AND fi.status IN ('PENDING', 'EXPIRED')
            AND (
              fi."expectedPaymentDate" BETWEEN $2 AND $3
              OR fi."expectedPaymentDate" < $2
            )
          GROUP BY p.currency

          UNION ALL

          SELECT
            p.currency as currency,
            COALESCE(SUM(fi."coutePending" + fi."lateFeeAmountPending"), 0) as total
          FROM clients c
          INNER JOIN sales s ON s."clientId" = c.id
          INNER JOIN lots l ON s."lotId" = l.id
          INNER JOIN blocks b ON l."blockId" = b.id
          INNER JOIN stages st ON b."stageId" = st.id
          INNER JOIN projects p ON st."projectId" = p.id
          LEFT JOIN urban_development ud ON ud.sale_id = s.id
          LEFT JOIN financing f ON ud.financing_id = f.id
          LEFT JOIN financing_installments fi ON fi."financingId" = f.id
          WHERE c.collector_id = $1
            AND fi.status IN ('PENDING', 'EXPIRED')
            AND (
              fi."expectedPaymentDate" BETWEEN $2 AND $3
              OR fi."expectedPaymentDate" < $2
            )
          GROUP BY p.currency
          `,
          [collector.id, startDate, endDate],
        );

        let pendingAmountPEN = 0;
        let pendingAmountUSD = 0;

        pendingAmountsResult.forEach((row: any) => {
          const amount = parseFloat(row.total || '0');
          if (row.currency === 'PEN') {
            pendingAmountPEN += amount;
          } else if (row.currency === 'USD') {
            pendingAmountUSD += amount;
          }
        });

        return {
          collectorId: collector.id,
          collectorDocument: collector.document,
          collectorName: `${collector.firstName} ${collector.lastName}`,
          collectorEmail: collector.email,
          numberOfClients,
          collectedAmountPEN,
          collectedAmountUSD,
          pendingAmountPEN,
          pendingAmountUSD,
        };
      }),
    );

    return PaginationHelper.createPaginatedResponse(
      statistics,
      statistics.length,
      filters,
    );
  }

  async findAllDepartamentos() {
    const departamentos = await this.ubigeoService.findByParentId(null);
    return departamentos.map((dep) => ({
      id: dep.id,
      name: dep.name,
    }));
  }

  async findProvinciasByDepartamento(departamentoId: number) {
    const provincias = await this.ubigeoService.findByParentId(departamentoId);
    return provincias.map((prov) => ({
      id: prov.id,
      name: prov.name,
    }));
  }

  async findDistritosByProvincia(provinciaId: number) {
    const distritos = await this.ubigeoService.findByParentId(provinciaId);
    return distritos.map((dist) => ({
      id: dist.id,
      name: dist.name,
    }));
  }

  async findAllCollectorsWithoutPagination() {
    const collectors = await this.userService.findAllCollectors();
    return collectors.map((collector) => ({
      id: collector.id,
      firstName: collector.firstName,
      lastName: collector.lastName,
      email: collector.email,
    }));
  }
}
