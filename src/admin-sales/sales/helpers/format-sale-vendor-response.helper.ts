import { Sale } from '../entities/sale.entity';

export function formatSaleVendorResponse(sale: Sale) {
  return {
    id: sale.id,
    type: sale.type,
    totalAmount: sale.totalAmount,
    status: sale.status,
    createdAt: sale.createdAt?.toISOString(),
    reservationAmount: sale.reservationAmount || null,
    reservationAmountPaid: sale.reservationAmountPaid ? Number(sale.reservationAmountPaid) : null,
    reservationAmountPending: sale.reservationAmountPending ? Number(sale.reservationAmountPending) : null,
    totalAmountPaid: sale.totalAmountPaid ? Number(sale.totalAmountPaid) : 0,
    totalAmountPending: sale.totalAmountPending ? Number(sale.totalAmountPending) : null,
    maximumHoldPeriod: sale.maximumHoldPeriod || null,
    fromReservation: sale.fromReservation || false,
    currency: sale.lot?.block?.stage?.project?.currency || null,
    client: {
      firstName: sale.client?.lead?.firstName || null,
      lastName: sale.client?.lead?.lastName || null,
      phone: sale.client?.lead?.phone || null,
      reportPdfUrl: sale.leadVisit?.reportPdfUrl || null,
    },
    lot: {
      id: sale.lot?.id || null,
      name: sale.lot?.name || null,
      area: sale.lot?.area || null,
      block: sale.lot?.block?.name || null,
      stage: sale.lot?.block?.stage?.name || null,
      project: sale.lot?.block?.stage?.project?.name || null,
    },
    radicationPdfUrl: sale.radicationPdfUrl || null,
    paymentAcordPdfUrl: sale.paymentAcordPdfUrl || null,
    financing: sale.financing
      ? {
          quantityCoutes: sale.financing.quantityCoutes,
          interestRate: sale.financing.interestRate,
          initialAmount: sale.financing.initialAmount,
          initialAmountPaid: sale.financing.initialAmountPaid || 0,
          initialAmountPending: sale.financing.initialAmountPending || sale.financing.initialAmount,
        }
      : null,
    urbanDevelopment: sale.urbanDevelopment
      ? {
          quantityCoutes: sale.urbanDevelopment.financing?.quantityCoutes || null,
          initialAmount: sale.urbanDevelopment.financing?.initialAmount || null,
          initialAmountPaid: sale.urbanDevelopment.financing?.initialAmountPaid || 0,
          initialAmountPending: sale.urbanDevelopment.financing?.initialAmountPending || sale.urbanDevelopment.financing?.initialAmount || null,
        }
      : null,
  };
}
