import { Sale } from '../entities/sale.entity';

function formatParticipant(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email || null,
    document: p.document,
    documentType: p.documentType,
    phone: p.phone,
    address: p.address,
    participantType: p.participantType,
  };
}

export function formatSaleListResponse(sale: Sale) {
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
      document: sale.client?.lead?.document || null,
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
    liner: formatParticipant(sale.liner),
    telemarketingSupervisor: formatParticipant(sale.telemarketingSupervisor),
    telemarketingConfirmer: formatParticipant(sale.telemarketingConfirmer),
    telemarketer: formatParticipant(sale.telemarketer),
    fieldManager: formatParticipant(sale.fieldManager),
    fieldSupervisor: formatParticipant(sale.fieldSupervisor),
    fieldSeller: formatParticipant(sale.fieldSeller),
    salesGeneralManager: formatParticipant(sale.salesGeneralManager),
    salesManager: formatParticipant(sale.salesManager),
    postSale: formatParticipant(sale.postSale),
    closer: formatParticipant(sale.closer),
    generalDirector: formatParticipant(sale.generalDirector),
    vendor: sale.vendor
      ? {
          id: sale.vendor.id,
          document: sale.vendor.document,
          firstName: sale.vendor.firstName,
          lastName: sale.vendor.lastName,
        }
      : null,
  };
}
