import { Sale } from "../entities/sale.entity";

export function formatSaleResponse(sale: Sale) {
  const { secondaryClientSales = [] } = sale;
  return {
    id: sale.id,
    type: sale.type,
    totalAmount: sale.totalAmount,
    contractDate: sale.contractDate?.toISOString(),
    status: sale.status,
    createdAt: sale.createdAt?.toISOString(),
    reservationAmount: sale.reservationAmount || null,
    maximumHoldPeriod: sale.maximumHoldPeriod || null,
    fromReservation: sale.fromReservation,
    currency: sale.lot.block?.stage?.project?.currency,
    client: {
      address: sale.client?.address,
      firstName: sale.client?.lead?.firstName,
      lastName: sale.client?.lead?.lastName,
      phone: sale.client?.lead?.phone,
      reportPdfUrl: sale.client?.lead?.reportPdfUrl,
    },
    secondaryClients: secondaryClientSales.length > 0 ?
      sale.secondaryClientSales.map((secondaryClientSale) => {
        return {
          address: secondaryClientSale.secondaryClient.address,
          firstName: secondaryClientSale.secondaryClient.firstName,
          lastName: secondaryClientSale.secondaryClient.lastName,
          phone: secondaryClientSale.secondaryClient.phone,
        };
      }): null,
    lot: {
      id: sale.lot?.id,
      name: sale.lot?.name,
      lotPrice: sale.lot?.lotPrice,
      block : sale.lot?.block?.name,
      stage : sale.lot?.block?.stage?.name,
      project : sale.lot?.block?.stage?.project?.name,
    },
    radicationPdfUrl: sale.radicationPdfUrl,
    paymentAcordPdfUrl: sale.paymentAcordPdfUrl,
    financing: sale.financing ? {
      id: sale.financing.id,
      initialAmount: sale.financing.initialAmount,
      interestRate: sale.financing.interestRate,
      quantityCoutes: sale.financing.quantityCoutes,
      financingInstallments: sale.financing.financingInstallments
        .map((installment) => {
          return {
            id: installment.id,
            couteAmount: installment.couteAmount,
            coutePending: installment.coutePending,
            coutePaid: installment.coutePaid,
            expectedPaymentDate: installment.expectedPaymentDate?.toISOString(), // Se mantiene el formato ISO string
            status: installment.status,
          };
        })
        .sort((a, b) => { // <-- ¡Aquí aplicamos el ordenamiento!
          // Convertir las fechas ISO string a objetos Date para compararlas
          const dateA = a.expectedPaymentDate ? new Date(a.expectedPaymentDate) : null;
          const dateB = b.expectedPaymentDate ? new Date(b.expectedPaymentDate) : null;

          // Manejar casos donde la fecha sea nula (opcional, decide tu lógica)
          // Si dateA es nula y dateB no, b va primero (más grande)
          if (dateA === null && dateB !== null) return 1;
          // Si dateB es nula y dateA no, a va primero (más pequeño)
          if (dateB === null && dateA !== null) return -1;
          // Si ambas son nulas o iguales, mantener el orden
          if (dateA === null && dateB === null) return 0;

          // Comparar las fechas: a - b para orden ascendente (más antiguo primero)
          return dateA.getTime() - dateB.getTime();
        }),
    } : null,
    // Participantes
    liner: sale.liner ? {
      firstName: sale.liner.firstName,
      lastName: sale.liner.lastName,
    } : null,
    telemarketingSupervisor: sale.telemarketingSupervisor ? {
      firstName: sale.telemarketingSupervisor.firstName,
      lastName: sale.telemarketingSupervisor.lastName,
    } : null,
    telemarketingConfirmer: sale.telemarketingConfirmer ? {
      firstName: sale.telemarketingConfirmer.firstName,
      lastName: sale.telemarketingConfirmer.lastName,
    } : null,
    telemarketer: sale.telemarketer ? {
      firstName: sale.telemarketer.firstName,
      lastName: sale.telemarketer.lastName,
    } : null,
    fieldManager: sale.fieldManager ? {
      firstName: sale.fieldManager.firstName,
      lastName: sale.fieldManager.lastName,
    } : null,
    fieldSupervisor: sale.fieldSupervisor ? {
      firstName: sale.fieldSupervisor.firstName,
      lastName: sale.fieldSupervisor.lastName,
    } : null,
    fieldSeller: sale.fieldSeller ? {
      firstName: sale.fieldSeller.firstName,
      lastName: sale.fieldSeller.lastName,
    } : null,
    guarantor: sale.guarantor ? {
      firstName: sale.guarantor.firstName,
      lastName: sale.guarantor.lastName,
    } : null,
    // reservation: sale.reservation ? {
    //   id: sale.reservation.id,
    //   amount: sale.reservation.amount,
    // } : null,
    vendor: sale.vendor ? {
      document: sale.vendor.document,
      firstName: sale.vendor.firstName,
      lastName: sale.vendor.lastName,
    } : null,
  };
}