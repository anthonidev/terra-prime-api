/**
 * Tipos de Nota de Débito según SUNAT/Nubefact
 */
export enum DebitNoteType {
  LATE_FEE_INTEREST = 1, // Intereses por mora
  VALUE_INCREASE = 2, // Aumento de valor
  PENALTIES = 3, // Penalidades
  IVAP_ADJUSTMENTS = 4, // Ajustes afectos al IVAP
  EXPORT_ADJUSTMENTS = 5, // Ajustes de operaciones de exportación
}

export const DebitNoteTypeDescriptions: Record<DebitNoteType, string> = {
  [DebitNoteType.LATE_FEE_INTEREST]: 'Intereses por mora',
  [DebitNoteType.VALUE_INCREASE]: 'Aumento de valor',
  [DebitNoteType.PENALTIES]: 'Penalidades',
  [DebitNoteType.IVAP_ADJUSTMENTS]: 'Ajustes afectos al IVAP',
  [DebitNoteType.EXPORT_ADJUSTMENTS]: 'Ajustes de operaciones de exportación',
};
