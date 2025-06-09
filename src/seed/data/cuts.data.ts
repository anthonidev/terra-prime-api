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
];
