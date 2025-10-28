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

@Injectable()
export class CollectionsService {
  constructor(
    private readonly clientService: ClientsService,
    private readonly userService: UsersService,
    private readonly saleService: SalesService,
    private readonly financingInstallmentsService: FinancingInstallmentsService,
    private readonly urbanDevelopmentService: UrbanDevelopmentService,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
  ){}

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
  ): Promise<ClientCollectionResponse[]> {
    const clients = await this.clientService.findAllByUser(
      userId,
      filters?.ubigeoId,
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
      [userId]
    );

    const clientIdsWithLatePayment = new Set(
      clientsWithLatePayment.map((row: any) => row.id)
    );

    const clientsFormatted = clients.map(formatClientResponse);
    return clientsFormatted.map(client => {
      const { collector, ...rest } = client;
      return {
        ...rest,
        hasActiveLatePayment: clientIdsWithLatePayment.has(client.id),
      };
    });
  }

  async findAllClientsWithCollection(
    filters: ClientFiltersDto,
  ): Promise<Paginated<ClientCollectionResponse>> {
    const { ubigeoId, ...paginationDto } = filters;
    const clients = await this.clientService.findAllClientsWithCollection(
      filters?.ubigeoId,
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
      `
    );

    const clientIdsWithLatePayment = new Set(
      clientsWithLatePayment.map((row: any) => row.id)
    );

    const clientsFormatted = clients.map(formatClientResponse).map(client => ({
      ...client,
      hasActiveLatePayment: clientIdsWithLatePayment.has(client.id),
    }));

    return PaginationHelper.createPaginatedResponse(
      clientsFormatted,
      clientsFormatted.length,
      paginationDto,
    );
  }

  async findAllSalesByClient(
    clientId: number,
  ): Promise<SaleResponse[]> {
    const sales = await this.saleService.findAllByClient(clientId);
    return sales;
  }

  async findOneSaleByIdForClient(
    saleId: string,
  ): Promise<SaleDetailCollectionResponse> {
    const sale = await this.saleService.findOneByIdWithCollections(saleId);
    const urbanDevelopment = await this.urbanDevelopmentService.findOneBySaleId(saleId);
    return {
      sale,
      urbanDevelopment: formatHuInstallmentsResponse(urbanDevelopment),
    };
  }

  async paidInstallments(
    financingId: string,
    amountPaid: number,
    paymentDetails: CreateDetailPaymentDto[],
    files: Express.Multer.File[],
    userId: string,
  ): Promise<PaymentResponse> {
    return await this.financingInstallmentsService.payInstallments(financingId, amountPaid, paymentDetails, files, userId);
  }

  async findAllPaymentsByCollector(filters: FindPaymentsDto, userId?: string)
  : Promise<Paginated<PaymentAllResponse>> {
    return await this.paymentsService.findAllPayments(filters, userId);
  }

  async findOnePaymentByCollector(paymentId: number): Promise<PaymentAllResponse> {
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
          [collector.id]
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
          [collector.id, startDate, endDate]
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
          [collector.id, startDate, endDate]
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
      })
    );

    return PaginationHelper.createPaginatedResponse(
      statistics,
      statistics.length,
      filters,
    );
  }
}
