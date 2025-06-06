import { Sale } from "../entities/sale.entity";

export function formatSaleCollectionResponse(sale: Sale) {
  const { secondaryClientSales = [] } = sale;
  return {
    id: sale.id,
    type: sale.type,
    totalAmount: sale.totalAmount,
    contractDate: sale.contractDate.toISOString(),
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    currency: sale.lot.block?.stage?.project?.currency,
    client: {
      address: sale.client?.address,
      firstName: sale.client?.lead?.firstName,
      lastName: sale.client?.lead?.lastName,
      phone: sale.client?.lead?.phone,
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
    },
    financing: sale.financing ? {
      id: sale.financing.id,
      initialAmount: sale.financing.initialAmount,
      interestRate: sale.financing.interestRate,
      quantityCoutes: sale.financing.quantityCoutes,
      financingInstallments: sale.financing.financingInstallments.map((installment) => {
        return {
          id: installment.id,
          couteAmount: installment.couteAmount,
          coutePending: installment.coutePending,
          coutePaid: installment.coutePaid,
          expectedPaymentDate: installment.expectedPaymentDate.toISOString(),
          status: installment.status,
        };
      }),
    } : null,
    guarantor: sale.guarantor ? {
      firstName: sale.guarantor.firstName,
      lastName: sale.guarantor.lastName,
    } : null,
    reservation: sale.reservation ? {
      id: sale.reservation.id,
      amount: sale.reservation.amount,
    } : null,
    vendor: sale.vendor ? {
      document: sale.vendor.document,
      firstName: sale.vendor.firstName,
      lastName: sale.vendor.lastName,
    } : null,
  };
}