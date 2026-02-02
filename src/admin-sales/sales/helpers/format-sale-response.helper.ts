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
    currency: sale.lot?.block?.stage?.project?.currency,
    client: sale.client ? {
      address: sale.client.address,
      firstName: sale.client.lead?.firstName,
      lastName: sale.client.lead?.lastName,
      phone: sale.client.lead?.phone,
      reportPdfUrl: sale.leadVisit?.reportPdfUrl ||
                     (sale.client.lead?.visits && sale.client.lead.visits.length > 0
                       ? sale.client.lead.visits[0].reportPdfUrl
                       : null),
    } : null,
    secondaryClients: secondaryClientSales.length > 0 ?
      sale.secondaryClientSales.map((secondaryClientSale) => {
        return {
          address: secondaryClientSale.secondaryClient.address,
          firstName: secondaryClientSale.secondaryClient.firstName,
          lastName: secondaryClientSale.secondaryClient.lastName,
          phone: secondaryClientSale.secondaryClient.phone,
        };
      }): null,
    lot: sale.lot ? {
      id: sale.lot.id,
      name: sale.lot.name,
      lotPrice: sale.lot.lotPrice,
      block: sale.lot.block?.name,
      stage: sale.lot.block?.stage?.name,
      project: sale.lot.block?.stage?.project?.name,
    } : null,
    radicationPdfUrl: sale.radicationPdfUrl,
    paymentAcordPdfUrl: sale.paymentAcordPdfUrl,
    financing: sale.financing ? {
      id: sale.financing.id,
      initialAmount: sale.financing.initialAmount,
      interestRate: sale.financing.interestRate,
      quantityCoutes: sale.financing.quantityCoutes,
      financingInstallments: (() => {
        const mappedInstallments = sale.financing.financingInstallments.map((installment) => {
          return {
            id: installment.id,
            numberCuote: installment.numberCuote,
            couteAmount: installment.couteAmount,
            coutePending: installment.coutePending,
            coutePaid: installment.coutePaid,
            expectedPaymentDate: installment.expectedPaymentDate?.toISOString(),
            lateFeeAmountPending: installment.lateFeeAmountPending,
            lateFeeAmountPaid: installment.lateFeeAmountPaid,
            status: installment.status,
          };
        });

        // ✅ Verificar si TODAS las cuotas tienen numberCuote
        const allHaveNumberCuote = mappedInstallments.every(
          (inst) => inst.numberCuote !== null && inst.numberCuote !== undefined
        );

        // ✅ Ordenar según el criterio
        return mappedInstallments.sort((a, b) => {
          if (allHaveNumberCuote) {
            // Si todas tienen numberCuote, ordenar por numberCuote
            return a.numberCuote - b.numberCuote;
          } else {
            // Si al menos una tiene null, ordenar por fecha (ascendente)
            const dateA = a.expectedPaymentDate ? new Date(a.expectedPaymentDate) : null;
            const dateB = b.expectedPaymentDate ? new Date(b.expectedPaymentDate) : null;

            if (dateA === null && dateB !== null) return 1;
            if (dateB === null && dateA !== null) return -1;
            if (dateA === null && dateB === null) return 0;

            return dateA.getTime() - dateB.getTime();
          }
        });
      })(),
    } : null,
    urbanDevelopment: sale.urbanDevelopment ? {
      id: sale.urbanDevelopment.id,
      amount: sale.urbanDevelopment.amount,
      initialAmount: sale.urbanDevelopment.initialAmount,
      status: sale.urbanDevelopment.status,
      financing: sale.urbanDevelopment.financing ? {
        id: sale.urbanDevelopment.financing.id,
        initialAmount: sale.urbanDevelopment.financing.initialAmount,
        interestRate: sale.urbanDevelopment.financing.interestRate,
        quantityCoutes: sale.urbanDevelopment.financing.quantityCoutes,
        financingInstallments: (() => {
          const mappedInstallments = sale.urbanDevelopment.financing.financingInstallments.map((installment) => ({
            id: installment.id,
            numberCuote: installment.numberCuote,
            couteAmount: installment.couteAmount,
            coutePending: installment.coutePending,
            coutePaid: installment.coutePaid,
            expectedPaymentDate: installment.expectedPaymentDate?.toISOString(),
            lateFeeAmountPending: installment.lateFeeAmountPending,
            lateFeeAmountPaid: installment.lateFeeAmountPaid,
            status: installment.status,
          }));

          // ✅ Verificar si TODAS las cuotas tienen numberCuote
          const allHaveNumberCuote = mappedInstallments.every(
            (inst) => inst.numberCuote !== null && inst.numberCuote !== undefined
          );

          // ✅ Ordenar según el criterio
          return mappedInstallments.sort((a, b) => {
            if (allHaveNumberCuote) {
              // Si todas tienen numberCuote, ordenar por numberCuote
              return a.numberCuote - b.numberCuote;
            } else {
              // Si al menos una tiene null, ordenar por fecha (ascendente)
              const dateA = a.expectedPaymentDate ? new Date(a.expectedPaymentDate) : null;
              const dateB = b.expectedPaymentDate ? new Date(b.expectedPaymentDate) : null;

              if (dateA === null && dateB !== null) return 1;
              if (dateB === null && dateA !== null) return -1;
              if (dateA === null && dateB === null) return 0;

              return dateA.getTime() - dateB.getTime();
            }
          });
        })(),
      } : undefined,
    } : undefined,
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
    salesGeneralManager: sale.salesGeneralManager ? {
      firstName: sale.salesGeneralManager.firstName,
      lastName: sale.salesGeneralManager.lastName,
    } : null,
    salesManager: sale.salesManager ? {
      firstName: sale.salesManager.firstName,
      lastName: sale.salesManager.lastName,
    } : null,
    postSale: sale.postSale ? {
      firstName: sale.postSale.firstName,
      lastName: sale.postSale.lastName,
    } : null,
    closer: sale.closer ? {
      firstName: sale.closer.firstName,
      lastName: sale.closer.lastName,
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