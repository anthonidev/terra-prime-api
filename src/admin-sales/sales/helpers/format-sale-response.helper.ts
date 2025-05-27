import { Sale } from "../entities/sale.entity";

export function formatSaleResponse(sale: Sale) {
  return {
    id: sale.id,
    type: sale.type,
    totalAmount: sale.totalAmount,
    contractDate: sale.contractDate.toISOString(),
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    client: {
      address: sale.client?.address,
      firstName: sale.client?.lead?.firstName,
      lastName: sale.client?.lead?.lastName,
      phone: sale.client?.lead?.phone,
    },
    lot: {
      name: sale.lot?.name,
      lotPrice: sale.lot?.lotPrice,
    },
    financing: sale.financing ? {
      initialAmount: sale.financing.initialAmount,
      interestRate: sale.financing.interestRate,
      quantityCoutes: sale.financing.quantityCoutes,
      financingInstallments: sale.financing.financingInstallments.map((installment) => {
        return {
          couteAmount: installment.couteAmount,
          expectedPaymentDate: installment.expectedPaymentDate.toISOString(),
        };
      }),
    } : null,
    guarantor: sale.guarantor ? {
      firstName: sale.guarantor.firstName,
      lastName: sale.guarantor.lastName,
    } : null,
    reservation: sale.reservation ? {
      amount: sale.reservation.amount,
    } : null,
    vendor: sale.vendor ? {
      document: sale.vendor.document,
      firstName: sale.vendor.firstName,
      lastName: sale.vendor.lastName,
    } : null,
  };
}