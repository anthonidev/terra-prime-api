export const paymentConfigsData = [
  {
    code: 'SALE_PAYMENT',
    name: 'Pago total de venta',
    description: 'Pago del monto total de la venta',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0, 
    maximumAmount: null,
  },
  {
    code: 'FINANCING_PAYMENT',
    name: 'Pago inicial de financiación de la venta',
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
      'Pago de cuotas de financiación de la venta',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0,
    maximumAmount: null,
  },
  {
    code: 'RESERVATION_PAYMENT',
    name: 'Pago de reserva de la venta',
    description: 'Pago de reserva de la venta',
    requiresApproval: true,
    isActive: true,
    minimumAmount: 0,
    maximumAmount: null,
  },
];
