export const paymentConfigsData = [
  {
    code: 'SALE_PAYMENT',
    name: 'Pago total de venta',
    description: 'Monto total',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0, 
    maximumAmount: null,
  },
  {
    code: 'FINANCING_PAYMENT',
    name: 'Monto inicial',
    description:
      'Pago inicial de financiación de la venta',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0,
    maximumAmount: null,
  },
  {
    code: 'FINANCING_INSTALLMENTS_PAYMENT',
    name: 'Pago de cuotas de financiación de la venta',
    description:
      'Monto de cuota',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0,
    maximumAmount: null,
  },
  {
    code: 'RESERVATION_PAYMENT',
    name: 'Monto de reserva',
    description: 'Pago de reserva de la venta',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0,
    maximumAmount: null,
  },
];
