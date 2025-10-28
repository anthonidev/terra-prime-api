import { CutFrequency } from 'src/cuts/entities/cut_configurations.entity';

export const cutConfigurationsData = [
  {
    code: 'DAILY_LEADS_CLEANUP',
    name: 'Corte diario de leads',
    description: 'Borra leads que no están en la oficina y se les quita el vendedor asignado',
    frequency: CutFrequency.DAILY,
    isActive: true,
    cronExpression: '06 16 * * *',
    dayOfMonth: 0,
    dayOfWeek: 0,
    hour: 3,
    minute: 0,
  },
  {
    code: 'DAILY_EXPIRED_RESERVATIONS',
    name: 'Corte diario de reservas expiradas',
    description: 'Evalúa y actualiza el estado de las reservas que han excedido su período máximo de retención',
    frequency: CutFrequency.DAILY,
    isActive: true,
    cronExpression: '10 0 * * *', // Ejecutar a las 00:10 todos los días
    dayOfMonth: 0,
    dayOfWeek: 0,
    hour: 0,
    minute: 10,
  },
  {
    code: 'DAILY_LATE_FEE_INCREASE',
    name: 'Corte diario de aumento de mora',
    description: 'Aumenta en 5 el monto de mora de las cuotas que no se han pagado y exceden el período de gracia de 3 días después de la fecha esperada de pago',
    frequency: CutFrequency.DAILY,
    isActive: true,
    cronExpression: '00 1 * * *', // Ejecutar a las 01:00 todos los días
    dayOfMonth: 0,
    dayOfWeek: 0,
    hour: 1,
    minute: 0,
  },
];
