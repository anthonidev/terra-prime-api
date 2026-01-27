export enum IgvType {
  // Gravado (códigos 1-7)
  TAXED_ONEROUS_OPERATION = 1, // Gravado - Operación Onerosa
  TAXED_WITHDRAWAL_PRIZE = 2, // Gravado - Retiro por premio
  TAXED_WITHDRAWAL_DONATION = 3, // Gravado - Retiro por donación
  TAXED_WITHDRAWAL = 4, // Gravado - Retiro
  TAXED_WITHDRAWAL_ADVERTISING = 5, // Gravado - Retiro por publicidad
  TAXED_BONUSES = 6, // Gravado - Bonificaciones
  TAXED_WITHDRAWAL_EMPLOYEE = 7, // Gravado - Retiro por entrega a trabajadores

  // Exonerado (códigos 8, 17)
  EXONERATED_ONEROUS_OPERATION = 8, // Exonerado - Operación Onerosa
  EXONERATED_FREE_TRANSFER = 17, // Exonerado - Transferencia Gratuita

  // Inafecto (códigos 9-15, 20)
  UNAFFECTED_ONEROUS_OPERATION = 9, // Inafecto - Operación Onerosa
  UNAFFECTED_BONUS_WITHDRAWAL = 10, // Inafecto - Retiro por Bonificación
  UNAFFECTED_WITHDRAWAL = 11, // Inafecto - Retiro
  UNAFFECTED_MEDICAL_SAMPLES = 12, // Inafecto - Retiro por Muestras Médicas
  UNAFFECTED_COLLECTIVE_AGREEMENT = 13, // Inafecto - Retiro por Convenio Colectivo
  UNAFFECTED_PRIZE_WITHDRAWAL = 14, // Inafecto - Retiro por premio
  UNAFFECTED_ADVERTISING_WITHDRAWAL = 15, // Inafecto - Retiro por publicidad
  UNAFFECTED_FREE_TRANSFER = 20, // Inafecto - Transferencia Gratuita

  // Exportación
  EXPORT = 16, // Exportación
}
