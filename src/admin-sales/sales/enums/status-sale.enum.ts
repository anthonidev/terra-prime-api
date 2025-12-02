export enum StatusSale {
  // ========== ESTADOS DE RESERVA ==========
  RESERVATION_PENDING = 'RESERVATION_PENDING', // Reserva registrada, sin pagos
  RESERVATION_PENDING_APPROVAL = 'RESERVATION_PENDING_APPROVAL', // Pago de reserva pendiente de aprobación
  RESERVATION_IN_PAYMENT = 'RESERVATION_IN_PAYMENT', // Pago parcial de reserva aprobado, aún falta dinero
  RESERVED = 'RESERVED', // Reserva completada y aprobada

  // ========== ESTADOS DE VENTA DIRECTA ==========
  PENDING = 'PENDING', // Venta creada, sin pagos
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Pago pendiente de aprobación (puede ser parcial o total)
  IN_PAYMENT = 'IN_PAYMENT', // Pago parcial aprobado, aún falta dinero
  APPROVED = 'APPROVED', // Venta aprobada (mantener por compatibilidad)
  COMPLETED = 'COMPLETED', // Venta completada y totalmente pagada

  // ========== ESTADOS DE VENTA FINANCIADA ==========
  // (usa PENDING, PENDING_APPROVAL, IN_PAYMENT para la inicial)
  IN_PAYMENT_PROCESS = 'IN_PAYMENT_PROCESS', // Inicial aprobada, pagando cuotas

  // ========== ESTADOS FINALES ==========
  REJECTED = 'REJECTED', // Rechazada (incluye reservas rechazadas/expiradas)
  WITHDRAWN = 'WITHDRAWN', // Retirada (incluye reservas anuladas)
}
