import { UrbanDevelopment } from '../../../admin-sales/urban-development/entities/urban-development.entity';
export const formatHuInstallmentsResponse = (urbanDevelopment: UrbanDevelopment) => {
  return {
      financing: urbanDevelopment?.financing ? {
        id: urbanDevelopment.financing.id,
        initialAmount: urbanDevelopment.financing.initialAmount,
        interestRate: urbanDevelopment.financing.interestRate,
        quantityCoutes: urbanDevelopment.financing.quantityCoutes,
        financingInstallments: urbanDevelopment.financing.financingInstallments.map((installment) => {
          return {
            id: installment.id,
            couteAmount: installment.couteAmount,
            coutePending: installment.coutePending,
            coutePaid: installment.coutePaid,
            expectedPaymentDate: installment.expectedPaymentDate?.toISOString(),
            status: installment.status,
          };
        }),
      } : null,
    };
}