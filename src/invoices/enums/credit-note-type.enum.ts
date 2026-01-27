/**
 * Tipos de Nota de Crédito según SUNAT/Nubefact
 */
export enum CreditNoteType {
  CANCELLATION = 1, // Anulación de la operación
  CANCELLATION_RUC_ERROR = 2, // Anulación por error en el RUC
  DESCRIPTION_CORRECTION = 3, // Corrección por error en la descripción
  GLOBAL_DISCOUNT = 4, // Descuento global
  ITEM_DISCOUNT = 5, // Descuento por ítem
  TOTAL_RETURN = 6, // Devolución total
  ITEM_RETURN = 7, // Devolución por ítem
  BONUS = 8, // Bonificación
  VALUE_DECREASE = 9, // Disminución en el valor
  OTHER_CONCEPTS = 10, // Otros conceptos
  IVAP_ADJUSTMENTS = 11, // Ajustes afectos al IVAP
  EXPORT_ADJUSTMENTS = 12, // Ajustes de operaciones de exportación
  PAYMENT_ADJUSTMENTS = 13, // Ajustes - Montos y/o fechas de pago
}

export const CreditNoteTypeDescriptions: Record<CreditNoteType, string> = {
  [CreditNoteType.CANCELLATION]: 'Anulación de la operación',
  [CreditNoteType.CANCELLATION_RUC_ERROR]: 'Anulación por error en el RUC',
  [CreditNoteType.DESCRIPTION_CORRECTION]: 'Corrección por error en la descripción',
  [CreditNoteType.GLOBAL_DISCOUNT]: 'Descuento global',
  [CreditNoteType.ITEM_DISCOUNT]: 'Descuento por ítem',
  [CreditNoteType.TOTAL_RETURN]: 'Devolución total',
  [CreditNoteType.ITEM_RETURN]: 'Devolución por ítem',
  [CreditNoteType.BONUS]: 'Bonificación',
  [CreditNoteType.VALUE_DECREASE]: 'Disminución en el valor',
  [CreditNoteType.OTHER_CONCEPTS]: 'Otros conceptos',
  [CreditNoteType.IVAP_ADJUSTMENTS]: 'Ajustes afectos al IVAP',
  [CreditNoteType.EXPORT_ADJUSTMENTS]: 'Ajustes de operaciones de exportación',
  [CreditNoteType.PAYMENT_ADJUSTMENTS]: 'Ajustes - Montos y/o fechas de pago',
};
