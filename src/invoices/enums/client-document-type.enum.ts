export enum ClientDocumentType {
  NO_DOMICILIADO = 0, // No domiciliado, sin RUC (Exportación)
  DNI = 1, // DNI - Doc. Nacional de Identidad
  FOREIGN_CARD = 4, // Carnet de Extranjería
  RUC = 6, // RUC - Registro Único de Contribuyente
  PASSPORT = 7, // Pasaporte
  DIPLOMATIC_ID = 'A', // Cédula Diplomática de Identidad
  DOC_PAIS_RESIDENCIA = 'B', // Doc. Ident. País Residencia - No Domiciliado
  VARIOS = '-', // Varios - Ventas menores a S/.700.00
  SALVOCONDUCTO = 'G', // Salvoconducto
}
