export enum IgvType {
  TAXED_ONEROUS_OPERATION = 1, // Gravado - Operación Onerosa
  TAXED_WITHDRAWAL_PRIZE = 2, // Gravado - Retiro por premio
  TAXED_WITHDRAWAL_DONATION = 3, // Gravado - Retiro por donación
  TAXED_WITHDRAWAL = 4, // Gravado - Retiro
  TAXED_WITHDRAWAL_ADVERTISING = 5, // Gravado - Retiro por publicidad
  TAXED_BONUSES = 6, // Gravado - Bonificaciones
  TAXED_WITHDRAWAL_EMPLOYEE = 7, // Gravado - Retiro por entrega a trabajadores
  EXONERATED_ONEROUS_OPERATION = 11, // Exonerado - Operación Onerosa
  EXONERATED_FREE_TRANSFER = 12, // Exonerado - Transferencia gratuita
  UNAFFECTED_ONEROUS_OPERATION = 13, // Inafecto - Operación Onerosa
  UNAFFECTED_BONUS_WITHDRAWAL = 14, // Inafecto - Retiro por Bonificación
  UNAFFECTED_WITHDRAWAL = 15, // Inafecto - Retiro
  UNAFFECTED_MEDICAL_SAMPLES = 16, // Inafecto - Retiro por Muestras Médicas
  UNAFFECTED_COLLECTIVE_AGREEMENT = 17, // Inafecto - Retiro por Convenio Colectivo
  UNAFFECTED_PRIZE_WITHDRAWAL = 18, // Inafecto - Retiro por premio
  EXPORT = 21, // Exportación
}
