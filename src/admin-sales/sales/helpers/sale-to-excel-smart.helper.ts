import { Sale } from '../entities/sale.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { StatusFinancingInstallments } from 'src/admin-sales/financing/enums/status-financing-installments.enum';
import { StatusPayment } from 'src/admin-payments/payments/enums/status-payments.enum';
import * as ExcelJS from 'exceljs';

// ============================================================
// DICCIONARIOS DE TRADUCCIÓN PARA ENUMS
// ============================================================

export const ENUM_TRANSLATIONS = {
  StatusSale: {
    RESERVATION_PENDING: 'Reserva Pendiente',
    RESERVATION_PENDING_APPROVAL: 'Reserva Pendiente de Aprobación',
    RESERVATION_IN_PAYMENT: 'Reserva en Proceso de Pago',
    RESERVED: 'Reservado',
    PENDING: 'Venta Pendiente',
    PENDING_APPROVAL: 'Pendiente de Aprobación',
    IN_PAYMENT: 'En Proceso de Pago',
    APPROVED: 'Aprobado',
    COMPLETED: 'Completado',
    IN_PAYMENT_PROCESS: 'Pagando Cuotas',
    REJECTED: 'Rechazado',
    WITHDRAWN: 'Retirado',
  },
  SaleType: {
    DIRECT_PAYMENT: 'Pago Directo / Al Contado',
    FINANCED: 'Financiado',
  },
  FinancingType: {
    CREDITO: 'Crédito',
    DEBITO: 'Débito',
  },
  StatusFinancingInstallments: {
    PENDING: 'Pendiente',
    EXPIRED: 'Vencido',
    PAID: 'Pagado',
  },
  StatusPayment: {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    COMPLETED: 'Completado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
  },
  DocumentType: {
    DNI: 'DNI',
    CE: 'Carné de Extranjería',
    RUC: 'RUC',
  },
  ParticipantType: {
    LINER: 'Liner',
    TELEMARKETING_SUPERVISOR: 'Supervisor de Telemarketing',
    TELEMARKETING_CONFIRMER: 'Confirmador de Telemarketing',
    TELEMARKETER: 'Telemarketer',
    FIELD_MANAGER: 'Jefe de Campo',
    FIELD_SUPERVISOR: 'Supervisor de Campo',
    FIELD_SELLER: 'Vendedor de Campo',
    SALES_MANAGER: 'Jefe de Ventas',
    SALES_GENERAL_MANAGER: 'Gerente General de Ventas',
    POST_SALE: 'Post-Venta',
    CLOSER: 'Closer',
  },
  LotStatus: {
    Activo: 'Activo',
    Inactivo: 'Inactivo',
    Vendido: 'Vendido',
    Separado: 'Separado',
  },
};

// ============================================================
// ESTILOS
// ============================================================

const COLORS = {
  // Headers y títulos
  HEADER_BG: 'FF1F4E79',      // Azul oscuro
  HEADER_FONT: 'FFFFFFFF',    // Blanco

  // Secciones
  SECTION_BG: 'FF2E75B6',     // Azul medio
  SECTION_FONT: 'FFFFFFFF',   // Blanco

  // Filas alternadas
  ROW_EVEN: 'FFF2F2F2',       // Gris muy claro
  ROW_ODD: 'FFFFFFFF',        // Blanco

  // Cuotas según estado
  PAID_BG: 'FFC6EFCE',        // Verde claro - PAGADAS (no editables)
  PAID_FONT: 'FF006100',      // Verde oscuro

  EXPIRED_BG: 'FFFFC7CE',     // Rojo claro - VENCIDAS
  EXPIRED_FONT: 'FF9C0006',   // Rojo oscuro

  PENDING_BG: 'FFFFFFFF',     // Blanco - PENDIENTES (editables)
  PENDING_FONT: 'FF000000',   // Negro

  // Campos editables
  EDITABLE_BG: 'FFFFF2CC',    // Amarillo muy claro

  // Información de referencia (no editable)
  READONLY_BG: 'FFE7E6E6',    // Gris claro
  READONLY_FONT: 'FF666666',  // Gris oscuro

  // Totales
  TOTAL_BG: 'FFD9E1F2',       // Azul muy claro
  TOTAL_FONT: 'FF1F4E79',     // Azul oscuro
};

const STYLES = {
  header: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.HEADER_BG } },
    font: { bold: true, color: { argb: COLORS.HEADER_FONT }, size: 11 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const },
    },
  },
  sectionTitle: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.SECTION_BG } },
    font: { bold: true, color: { argb: COLORS.SECTION_FONT }, size: 12 },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  },
  label: {
    font: { bold: true, size: 10 },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.ROW_EVEN } },
  },
  value: {
    font: { size: 10 },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
  },
  paidRow: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.PAID_BG } },
    font: { color: { argb: COLORS.PAID_FONT }, size: 10 },
  },
  expiredRow: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.EXPIRED_BG } },
    font: { color: { argb: COLORS.EXPIRED_FONT }, size: 10 },
  },
  pendingRow: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.PENDING_BG } },
    font: { color: { argb: COLORS.PENDING_FONT }, size: 10 },
  },
  editable: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.EDITABLE_BG } },
  },
  readonly: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.READONLY_BG } },
    font: { color: { argb: COLORS.READONLY_FONT }, size: 10 },
  },
  total: {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORS.TOTAL_BG } },
    font: { bold: true, color: { argb: COLORS.TOTAL_FONT }, size: 11 },
  },
};

// ============================================================
// UTILIDADES
// ============================================================

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function translateEnum(enumName: string, value: string | null | undefined): string {
  if (!value) return '';
  const translations = ENUM_TRANSLATIONS[enumName];
  if (!translations) return value;
  return translations[value] || value;
}

function safeValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && value.trim() === '') return '';
  return String(value);
}

function safeNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

function applyRowStyle(row: ExcelJS.Row, style: any, startCol: number = 1, endCol: number = 10) {
  for (let i = startCol; i <= endCol; i++) {
    const cell = row.getCell(i);
    if (style.fill) cell.fill = style.fill;
    if (style.font) cell.font = { ...cell.font, ...style.font };
    if (style.alignment) cell.alignment = style.alignment;
    if (style.border) cell.border = style.border;
  }
}

function setCellBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  };
}

// ============================================================
// TAB 1: INFORMACIÓN DEL CLIENTE
// ============================================================

function createClientSheet(workbook: ExcelJS.Workbook, sale: Sale): void {
  const sheet = workbook.addWorksheet('Cliente', {
    properties: { tabColor: { argb: 'FF4472C4' } },
  });

  const lead = sale.client?.lead;
  const currency = sale.lot?.currency || 'PEN';
  let rowNum = 1;

  // Configurar anchos de columna
  sheet.columns = [
    { width: 25 },  // A - Labels
    { width: 40 },  // B - Values
    { width: 25 },  // C - Labels
    { width: 40 },  // D - Values
  ];

  // ============ TÍTULO PRINCIPAL ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  const titleRow = sheet.getRow(rowNum);
  titleRow.getCell(1).value = 'INFORMACIÓN DEL CLIENTE';
  titleRow.getCell(1).fill = STYLES.header.fill;
  titleRow.getCell(1).font = { ...STYLES.header.font, size: 14 };
  titleRow.getCell(1).alignment = STYLES.header.alignment;
  titleRow.height = 30;
  rowNum += 2;

  // ============ DATOS PERSONALES ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'DATOS PERSONALES';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const personalData = [
    ['Nombre Completo', lead ? `${lead.firstName} ${lead.lastName}` : '', 'Email', safeValue(lead?.email)],
    ['Tipo Documento', translateEnum('DocumentType', lead?.documentType), 'Teléfono 1', safeValue(lead?.phone)],
    ['Nro. Documento', safeValue(lead?.document), 'Teléfono 2', safeValue(lead?.phone2)],
    ['Edad', lead?.age ? `${lead.age} años` : '', 'Dirección', safeValue(sale.client?.address)],
  ];

  personalData.forEach((rowData) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ UBICACIÓN Y ORIGEN ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'UBICACIÓN Y ORIGEN DEL LEAD';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const locationData = [
    ['Ubigeo', safeValue(lead?.ubigeo?.name), 'Código Ubigeo', safeValue(lead?.ubigeo?.code)],
    ['Fuente del Lead', safeValue(lead?.source?.name), '¿En Oficina?', lead?.isInOffice ? 'Sí' : 'No'],
    ['Proyectos de Interés', lead?.interestProjects?.join(', ') || '', 'Fecha Registro', formatDateTime(lead?.createdAt)],
  ];

  locationData.forEach((rowData) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ VENDEDOR Y COBRADOR ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'VENDEDOR Y COBRADOR';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const staffData = [
    ['Vendedor', sale.vendor ? `${sale.vendor.firstName} ${sale.vendor.lastName}` : '', 'Email Vendedor', safeValue(sale.vendor?.email)],
    ['Cobrador', sale.client?.collector ? `${sale.client.collector.firstName} ${sale.client.collector.lastName}` : '', 'Email Cobrador', safeValue(sale.client?.collector?.email)],
  ];

  staffData.forEach((rowData) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ GARANTE ============
  if (sale.guarantor) {
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    sheet.getRow(rowNum).getCell(1).value = 'GARANTE';
    applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
    sheet.getRow(rowNum).height = 25;
    rowNum++;

    const guarantorData = [
      ['Nombre', `${sale.guarantor.firstName} ${sale.guarantor.lastName}`, 'Documento', safeValue(sale.guarantor.document)],
      ['Teléfono', safeValue(sale.guarantor.phone), 'Email', safeValue(sale.guarantor.email)],
      ['Dirección', safeValue(sale.guarantor.address), '', ''],
    ];

    guarantorData.forEach((rowData) => {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = rowData[0];
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(2).value = rowData[1];
      row.getCell(3).value = rowData[2];
      row.getCell(3).font = { bold: true, size: 10 };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(4).value = rowData[3];
      for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
      rowNum++;
    });
    rowNum++;
  }

  // ============ CLIENTES SECUNDARIOS ============
  if (sale.secondaryClientSales?.length > 0) {
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    sheet.getRow(rowNum).getCell(1).value = 'CLIENTES SECUNDARIOS / CO-TITULARES';
    applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
    sheet.getRow(rowNum).height = 25;
    rowNum++;

    sale.secondaryClientSales.forEach((scs, index) => {
      const sc = scs.secondaryClient;
      if (sc) {
        const row = sheet.getRow(rowNum);
        row.getCell(1).value = `Co-titular ${index + 1}`;
        row.getCell(1).font = { bold: true, size: 10 };
        row.getCell(2).value = `${sc.firstName} ${sc.lastName}`;
        row.getCell(3).value = 'Documento';
        row.getCell(3).font = { bold: true, size: 10 };
        row.getCell(4).value = safeValue(sc.document);
        for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
        rowNum++;
      }
    });
  }

  // ============ ACOMPAÑANTE ============
  if (lead?.companionFullName || lead?.companionDni) {
    rowNum++;
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    sheet.getRow(rowNum).getCell(1).value = 'ACOMPAÑANTE';
    applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
    sheet.getRow(rowNum).height = 25;
    rowNum++;

    const companionData = [
      ['Nombre', safeValue(lead?.companionFullName), 'DNI', safeValue(lead?.companionDni)],
      ['Parentesco', safeValue(lead?.companionRelationship), '', ''],
    ];

    companionData.forEach((rowData) => {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = rowData[0];
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(2).value = rowData[1];
      row.getCell(3).value = rowData[2];
      row.getCell(3).font = { bold: true, size: 10 };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(4).value = rowData[3];
      for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
      rowNum++;
    });
  }
}

// ============================================================
// TAB 2: INFORMACIÓN DE LA VENTA
// ============================================================

function createSaleSheet(workbook: ExcelJS.Workbook, sale: Sale, payments: Payment[]): void {
  const sheet = workbook.addWorksheet('Venta', {
    properties: { tabColor: { argb: 'FF70AD47' } },
  });

  const currency = sale.lot?.currency || 'PEN';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';
  let rowNum = 1;

  // Configurar anchos de columna
  sheet.columns = [
    { width: 25 },  // A
    { width: 25 },  // B
    { width: 25 },  // C
    { width: 25 },  // D
  ];

  // ============ TÍTULO PRINCIPAL ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  const titleRow = sheet.getRow(rowNum);
  titleRow.getCell(1).value = 'INFORMACIÓN DE LA VENTA';
  titleRow.getCell(1).fill = STYLES.header.fill;
  titleRow.getCell(1).font = { ...STYLES.header.font, size: 14 };
  titleRow.getCell(1).alignment = STYLES.header.alignment;
  titleRow.height = 30;
  rowNum += 2;

  // ============ IDENTIFICACIÓN ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'IDENTIFICACIÓN DE LA VENTA';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const identData = [
    ['ID Venta', sale.id, 'Código', safeValue(sale.metadata?.['Codigo'])],
    ['Estado', translateEnum('StatusSale', sale.status), 'Tipo', translateEnum('SaleType', sale.type)],
    ['Fecha Creación', formatDateTime(sale.createdAt), 'Fecha Contrato', formatDate(sale.contractDate)],
  ];

  identData.forEach((rowData) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ LOTE ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'INFORMACIÓN DEL LOTE';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const lotData = [
    ['Proyecto', safeValue(sale.lot?.block?.stage?.project?.name), 'Etapa', safeValue(sale.lot?.block?.stage?.name)],
    ['Manzana', safeValue(sale.lot?.block?.name), 'Lote', safeValue(sale.lot?.name)],
    ['Área (m²)', sale.lot?.area ? `${sale.lot.area} m²` : '', 'Moneda', currency === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)'],
    ['Precio Lote', `${currencySymbol} ${safeNumber(sale.lot?.lotPrice).toFixed(2)}`, 'Precio Urbanización', `${currencySymbol} ${safeNumber(sale.lot?.urbanizationPrice).toFixed(2)}`],
  ];

  lotData.forEach((rowData) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ RESUMEN FINANCIERO ============
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'RESUMEN FINANCIERO';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const financialData = [
    ['MONTO TOTAL', `${currencySymbol} ${safeNumber(sale.totalAmount).toFixed(2)}`, 'Pagado', `${currencySymbol} ${safeNumber(sale.totalAmountPaid).toFixed(2)}`],
    ['Pendiente', `${currencySymbol} ${safeNumber(sale.totalAmountPending).toFixed(2)}`, '', ''],
  ];

  financialData.forEach((rowData, idx) => {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = rowData[0];
    row.getCell(1).font = { bold: true, size: idx === 0 ? 11 : 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 0 ? 'FFD9E1F2' : 'FFF2F2F2' } };
    row.getCell(2).value = rowData[1];
    row.getCell(2).font = { bold: idx === 0, size: idx === 0 ? 11 : 10 };
    if (idx === 0) row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    row.getCell(3).value = rowData[2];
    row.getCell(3).font = { bold: true, size: 10 };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(4).value = rowData[3];
    for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
    rowNum++;
  });
  rowNum++;

  // ============ FINANCIAMIENTO ============
  if (sale.financing) {
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    sheet.getRow(rowNum).getCell(1).value = 'INFORMACIÓN DE FINANCIAMIENTO';
    applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
    sheet.getRow(rowNum).height = 25;
    rowNum++;

    const financingData = [
      ['Tipo Financiamiento', translateEnum('FinancingType', sale.financing.financingType), 'Tasa Interés', sale.financing.interestRate ? `${sale.financing.interestRate}%` : ''],
      ['Cuota Inicial', `${currencySymbol} ${safeNumber(sale.financing.initialAmount).toFixed(2)}`, 'Nro. Cuotas', safeValue(sale.financing.quantityCoutes)],
      ['Inicial Pagada', `${currencySymbol} ${safeNumber(sale.financing.initialAmountPaid).toFixed(2)}`, 'Inicial Pendiente', `${currencySymbol} ${safeNumber(sale.financing.initialAmountPending).toFixed(2)}`],
    ];

    financingData.forEach((rowData) => {
      const row = sheet.getRow(rowNum);
      row.getCell(1).value = rowData[0];
      row.getCell(1).font = { bold: true, size: 10 };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(2).value = rowData[1];
      row.getCell(3).value = rowData[2];
      row.getCell(3).font = { bold: true, size: 10 };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(4).value = rowData[3];
      for (let i = 1; i <= 4; i++) setCellBorder(row.getCell(i));
      rowNum++;
    });
  }

  // ============ PARTICIPANTES ============
  rowNum++;
  sheet.mergeCells(`A${rowNum}:D${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'PARTICIPANTES DE LA VENTA';
  applyRowStyle(sheet.getRow(rowNum), STYLES.sectionTitle, 1, 4);
  sheet.getRow(rowNum).height = 25;
  rowNum++;

  const participants = [
    { role: 'Liner', p: sale.liner },
    { role: 'Sup. Telemarketing', p: sale.telemarketingSupervisor },
    { role: 'Conf. Telemarketing', p: sale.telemarketingConfirmer },
    { role: 'Telemarketer', p: sale.telemarketer },
    { role: 'Jefe Campo', p: sale.fieldManager },
    { role: 'Sup. Campo', p: sale.fieldSupervisor },
    { role: 'Vendedor Campo', p: sale.fieldSeller },
    { role: 'Jefe Ventas', p: sale.salesManager },
    { role: 'Gte. Gral. Ventas', p: sale.salesGeneralManager },
    { role: 'Post-Venta', p: sale.postSale },
    { role: 'Closer', p: sale.closer },
  ].filter(x => x.p);

  for (let i = 0; i < participants.length; i += 2) {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = participants[i].role;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    row.getCell(2).value = `${participants[i].p.firstName} ${participants[i].p.lastName}`;

    if (participants[i + 1]) {
      row.getCell(3).value = participants[i + 1].role;
      row.getCell(3).font = { bold: true, size: 10 };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      row.getCell(4).value = `${participants[i + 1].p.firstName} ${participants[i + 1].p.lastName}`;
    }
    for (let j = 1; j <= 4; j++) setCellBorder(row.getCell(j));
    rowNum++;
  }

  if (participants.length === 0) {
    const row = sheet.getRow(rowNum);
    sheet.mergeCells(`A${rowNum}:D${rowNum}`);
    row.getCell(1).value = 'No hay participantes asignados';
    row.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    rowNum++;
  }
}

// ============================================================
// TAB 3: CUOTAS
// ============================================================

function createInstallmentsSheet(workbook: ExcelJS.Workbook, sale: Sale, payments: Payment[]): void {
  const sheet = workbook.addWorksheet('Cuotas', {
    properties: { tabColor: { argb: 'FFFFC000' } },
  });

  const currency = sale.lot?.currency || 'PEN';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';
  let rowNum = 1;

  // Configurar anchos de columna
  sheet.columns = [
    { width: 10, key: 'numero' },       // A - Número cuota
    { width: 15, key: 'vencimiento' },  // B - Fecha vencimiento
    { width: 18, key: 'monto' },        // C - Monto cuota
    { width: 18, key: 'pagado' },       // D - Monto pagado
    { width: 18, key: 'pendiente' },    // E - Monto pendiente
    { width: 15, key: 'mora' },         // F - Mora
    { width: 15, key: 'moraPagada' },   // G - Mora pagada
    { width: 15, key: 'estado' },       // H - Estado
  ];

  // ============ INFORMACIÓN DE REFERENCIA ============
  sheet.mergeCells('A1:H1');
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = 'CRONOGRAMA DE CUOTAS';
  titleRow.getCell(1).fill = STYLES.header.fill;
  titleRow.getCell(1).font = { ...STYLES.header.font, size: 14 };
  titleRow.getCell(1).alignment = STYLES.header.alignment;
  titleRow.height = 30;
  rowNum = 2;

  // Info de venta
  const infoRow1 = sheet.getRow(rowNum);
  infoRow1.getCell(1).value = 'ID Venta:';
  infoRow1.getCell(1).font = { bold: true };
  infoRow1.getCell(2).value = sale.id;
  infoRow1.getCell(4).value = 'Cliente:';
  infoRow1.getCell(4).font = { bold: true };
  infoRow1.getCell(5).value = sale.client?.lead ? `${sale.client.lead.firstName} ${sale.client.lead.lastName}` : '';
  rowNum++;

  const infoRow2 = sheet.getRow(rowNum);
  infoRow2.getCell(1).value = 'Moneda:';
  infoRow2.getCell(1).font = { bold: true };
  infoRow2.getCell(2).value = currency;
  infoRow2.getCell(4).value = 'Monto Total:';
  infoRow2.getCell(4).font = { bold: true };
  infoRow2.getCell(5).value = `${currencySymbol} ${safeNumber(sale.totalAmount).toFixed(2)}`;
  rowNum += 2;

  // ============ LEYENDA DE COLORES ============
  sheet.mergeCells(`A${rowNum}:H${rowNum}`);
  sheet.getRow(rowNum).getCell(1).value = 'LEYENDA DE COLORES';
  sheet.getRow(rowNum).getCell(1).font = { bold: true, size: 11 };
  sheet.getRow(rowNum).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  rowNum++;

  // Leyenda - Pagado
  const legendPaid = sheet.getRow(rowNum);
  legendPaid.getCell(1).value = '■';
  legendPaid.getCell(1).font = { color: { argb: COLORS.PAID_FONT }, size: 14 };
  legendPaid.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PAID_BG } };
  sheet.mergeCells(`B${rowNum}:D${rowNum}`);
  legendPaid.getCell(2).value = 'PAGADO - Cuota completamente pagada';
  legendPaid.getCell(2).font = { size: 10 };
  rowNum++;

  // Leyenda - Vencido
  const legendExpired = sheet.getRow(rowNum);
  legendExpired.getCell(1).value = '■';
  legendExpired.getCell(1).font = { color: { argb: COLORS.EXPIRED_FONT }, size: 14 };
  legendExpired.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EXPIRED_BG } };
  sheet.mergeCells(`B${rowNum}:D${rowNum}`);
  legendExpired.getCell(2).value = 'VENCIDO - Cuota pasó la fecha de pago';
  legendExpired.getCell(2).font = { size: 10 };
  rowNum++;

  // Leyenda - Pendiente
  const legendPending = sheet.getRow(rowNum);
  legendPending.getCell(1).value = '■';
  legendPending.getCell(1).font = { color: { argb: 'FF000000' }, size: 14 };
  legendPending.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EDITABLE_BG } };
  sheet.mergeCells(`B${rowNum}:D${rowNum}`);
  legendPending.getCell(2).value = 'PENDIENTE - Cuota por pagar';
  legendPending.getCell(2).font = { size: 10 };
  rowNum += 2;

  // ============ HEADERS DE LA TABLA ============
  const headerRow = sheet.getRow(rowNum);
  const headers = ['#', 'Vencimiento', `Monto (${currencySymbol})`, `Pagado (${currencySymbol})`, `Pendiente (${currencySymbol})`, `Mora (${currencySymbol})`, `Mora Pag. (${currencySymbol})`, 'Estado'];

  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.fill = STYLES.header.fill;
    cell.font = STYLES.header.font;
    cell.alignment = STYLES.header.alignment;
    cell.border = STYLES.header.border;
  });
  headerRow.height = 25;
  rowNum++;

  // ============ DATOS DE CUOTAS ============
  if (sale.financing?.financingInstallments?.length > 0) {
    const sortedInstallments = [...sale.financing.financingInstallments].sort(
      (a, b) => (a.numberCuote || 0) - (b.numberCuote || 0),
    );

    let totalMonto = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    let totalMora = 0;
    let totalMoraPagada = 0;

    sortedInstallments.forEach((inst) => {
      const row = sheet.getRow(rowNum);
      const isPaid = inst.status === StatusFinancingInstallments.PAID;
      const isExpired = inst.status === StatusFinancingInstallments.EXPIRED;

      // Determinar estilo según estado
      let rowStyle: any;
      if (isPaid) {
        rowStyle = STYLES.paidRow;
      } else if (isExpired) {
        rowStyle = STYLES.expiredRow;
      } else {
        rowStyle = { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EDITABLE_BG } } };
      }

      const monto = safeNumber(inst.couteAmount);
      const pagado = safeNumber(inst.coutePaid);
      const pendiente = safeNumber(inst.coutePending);
      const mora = safeNumber(inst.lateFeeAmount);
      const moraPagada = safeNumber(inst.lateFeeAmountPaid);

      totalMonto += monto;
      totalPagado += pagado;
      totalPendiente += pendiente;
      totalMora += mora;
      totalMoraPagada += moraPagada;

      const rowData = [
        inst.numberCuote || '',                     // Número
        formatDate(inst.expectedPaymentDate),       // Vencimiento
        monto,                                      // Monto
        pagado,                                     // Pagado
        pendiente,                                  // Pendiente
        mora,                                       // Mora
        moraPagada,                                 // Mora pagada
        translateEnum('StatusFinancingInstallments', inst.status), // Estado
      ];

      rowData.forEach((value, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = value;

        // Aplicar estilo de fila
        if (rowStyle.fill) cell.fill = rowStyle.fill;
        if (rowStyle.font) cell.font = rowStyle.font;

        // Formato de números
        if (idx >= 2 && idx <= 6 && typeof value === 'number') {
          cell.numFmt = '#,##0.00';
        }

        // Alineación
        if (idx >= 2 && idx <= 6) {
          cell.alignment = { horizontal: 'right' };
        } else if (idx === 0) {
          cell.alignment = { horizontal: 'center' };
        }

        setCellBorder(cell);
      });

      rowNum++;
    });

    // ============ FILA DE TOTALES ============
    const totalRow = sheet.getRow(rowNum);
    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TOTALES:';
    totalRow.getCell(2).font = { bold: true, size: 11 };
    totalRow.getCell(3).value = totalMonto;
    totalRow.getCell(4).value = totalPagado;
    totalRow.getCell(5).value = totalPendiente;
    totalRow.getCell(6).value = totalMora;
    totalRow.getCell(7).value = totalMoraPagada;
    totalRow.getCell(8).value = '';

    for (let i = 1; i <= 8; i++) {
      const cell = totalRow.getCell(i);
      cell.fill = STYLES.total.fill;
      cell.font = STYLES.total.font;
      if (i >= 3 && i <= 7) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
      setCellBorder(cell);
    }
  } else {
    const emptyRow = sheet.getRow(rowNum);
    sheet.mergeCells(`A${rowNum}:H${rowNum}`);
    emptyRow.getCell(1).value = 'No hay cuotas registradas para esta venta (puede ser pago al contado)';
    emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    emptyRow.getCell(1).alignment = { horizontal: 'center' };
  }
}

// ============================================================
// TAB 4: PAGOS
// ============================================================

function createPaymentsSheet(workbook: ExcelJS.Workbook, sale: Sale, payments: Payment[]): void {
  const sheet = workbook.addWorksheet('Pagos', {
    properties: { tabColor: { argb: 'FF7030A0' } },
  });

  const currency = sale.lot?.currency || 'PEN';
  const currencySymbol = currency === 'USD' ? '$' : 'S/';
  let rowNum = 1;

  // Configurar anchos
  sheet.columns = [
    { width: 8 },   // A - #
    { width: 18 },  // B - Fecha
    { width: 18 },  // C - Monto
    { width: 15 },  // D - Estado
    { width: 15 },  // E - Banco
    { width: 15 },  // F - Nro Ticket
    { width: 20 },  // G - Tipo
    { width: 30 },  // H - Observación
  ];

  // Título
  sheet.mergeCells('A1:H1');
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = 'HISTORIAL DE PAGOS';
  titleRow.getCell(1).fill = STYLES.header.fill;
  titleRow.getCell(1).font = { ...STYLES.header.font, size: 14 };
  titleRow.getCell(1).alignment = STYLES.header.alignment;
  titleRow.height = 30;
  rowNum = 3;

  // Info
  const infoRow = sheet.getRow(rowNum);
  infoRow.getCell(1).value = 'ID Venta:';
  infoRow.getCell(1).font = { bold: true };
  infoRow.getCell(2).value = sale.id;
  infoRow.getCell(4).value = 'Total Pagos:';
  infoRow.getCell(4).font = { bold: true };
  infoRow.getCell(5).value = payments.length;
  rowNum += 2;

  // Headers
  const headerRow = sheet.getRow(rowNum);
  const headers = ['#', 'Fecha', `Monto (${currencySymbol})`, 'Estado', 'Banco', 'Nro. Ticket', 'Concepto', 'Observación'];

  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.fill = STYLES.header.fill;
    cell.font = STYLES.header.font;
    cell.alignment = STYLES.header.alignment;
    cell.border = STYLES.header.border;
  });
  headerRow.height = 25;
  rowNum++;

  // Datos
  if (payments.length === 0) {
    const emptyRow = sheet.getRow(rowNum);
    sheet.mergeCells(`A${rowNum}:H${rowNum}`);
    emptyRow.getCell(1).value = 'No hay pagos registrados';
    emptyRow.getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
    emptyRow.getCell(1).alignment = { horizontal: 'center' };
  } else {
    let totalAprobado = 0;
    let totalPendiente = 0;

    payments.forEach((payment, index) => {
      const row = sheet.getRow(rowNum);
      const isApproved = payment.status === StatusPayment.APPROVED || payment.status === StatusPayment.COMPLETED;
      const isPending = payment.status === StatusPayment.PENDING;
      const isRejected = payment.status === StatusPayment.REJECTED;

      let concepto = '';
      if (payment.relatedEntityType === 'reservation') concepto = 'Reserva/Separación';
      else if (payment.relatedEntityType === 'financing') concepto = 'Cuota Inicial';
      else if (payment.relatedEntityType === 'financingInstallments') concepto = `Cuota ${payment.metadata?.['Cuota referencia Excel'] || ''}`;

      const rowData = [
        index + 1,
        formatDateTime(payment.dateOperation),
        safeNumber(payment.amount),
        translateEnum('StatusPayment', payment.status),
        safeValue(payment.banckName),
        safeValue(payment.numberTicket),
        concepto,
        safeValue(payment.observation),
      ];

      rowData.forEach((value, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = value;

        // Colores según estado
        if (isApproved) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PAID_BG } };
          cell.font = { color: { argb: COLORS.PAID_FONT } };
        } else if (isRejected) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EXPIRED_BG } };
          cell.font = { color: { argb: COLORS.EXPIRED_FONT } };
        } else if (isPending) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EDITABLE_BG } };
        }

        if (idx === 2) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }

        setCellBorder(cell);
      });

      if (isApproved) totalAprobado += safeNumber(payment.amount);
      if (isPending) totalPendiente += safeNumber(payment.amount);

      rowNum++;
    });

    // Totales
    rowNum++;
    const totalRow = sheet.getRow(rowNum);
    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TOTALES:';
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = 'Aprobados:';
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(5).value = totalAprobado;
    totalRow.getCell(5).numFmt = '#,##0.00';
    totalRow.getCell(6).value = 'Pendientes:';
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(7).value = totalPendiente;
    totalRow.getCell(7).numFmt = '#,##0.00';

    for (let i = 1; i <= 8; i++) {
      const cell = totalRow.getCell(i);
      cell.fill = STYLES.total.fill;
    }
  }
}

// ============================================================
// TAB 5: LEYENDA
// ============================================================

function createLegendSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Leyenda', {
    properties: { tabColor: { argb: 'FF808080' } },
  });

  sheet.columns = [
    { width: 30 },  // A - Valor
    { width: 35 },  // B - Traducción
    { width: 50 },  // C - Descripción
  ];

  let rowNum = 1;

  // Título
  sheet.mergeCells('A1:C1');
  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = 'LEYENDA - DICCIONARIO DE VALORES';
  titleRow.getCell(1).fill = STYLES.header.fill;
  titleRow.getCell(1).font = { ...STYLES.header.font, size: 14 };
  titleRow.getCell(1).alignment = STYLES.header.alignment;
  titleRow.height = 30;
  rowNum = 3;

  const sections = [
    {
      title: 'ESTADOS DE VENTA (StatusSale)',
      items: [
        ['RESERVATION_PENDING', 'Reserva Pendiente', 'Reserva registrada sin pagos'],
        ['RESERVATION_PENDING_APPROVAL', 'Reserva Pend. Aprobación', 'Pago de reserva esperando aprobación'],
        ['RESERVATION_IN_PAYMENT', 'Reserva en Pago', 'Pago parcial de reserva aprobado'],
        ['RESERVED', 'Reservado', 'Reserva completada'],
        ['PENDING', 'Venta Pendiente', 'Venta creada sin pagos'],
        ['PENDING_APPROVAL', 'Pendiente Aprobación', 'Pago esperando aprobación'],
        ['IN_PAYMENT', 'En Proceso de Pago', 'Pago parcial aprobado'],
        ['APPROVED', 'Aprobado', 'Venta aprobada'],
        ['COMPLETED', 'Completado', 'Venta totalmente pagada'],
        ['IN_PAYMENT_PROCESS', 'Pagando Cuotas', 'Pagando cuotas mensuales'],
        ['REJECTED', 'Rechazado', 'Venta rechazada'],
        ['WITHDRAWN', 'Retirado', 'Venta anulada'],
      ],
    },
    {
      title: 'TIPO DE VENTA (SaleType)',
      items: [
        ['DIRECT_PAYMENT', 'Pago Directo', 'Pago total sin financiamiento'],
        ['FINANCED', 'Financiado', 'Pago en cuotas'],
      ],
    },
    {
      title: 'ESTADO DE CUOTAS (StatusFinancingInstallments)',
      items: [
        ['PENDING', 'Pendiente', 'Cuota no vencida ni pagada'],
        ['EXPIRED', 'Vencido', 'Cuota pasó fecha sin pago completo'],
        ['PAID', 'Pagado', 'Cuota completamente pagada'],
      ],
    },
    {
      title: 'ESTADO DE PAGO (StatusPayment)',
      items: [
        ['PENDING', 'Pendiente', 'Pago esperando revisión'],
        ['APPROVED', 'Aprobado', 'Pago verificado'],
        ['COMPLETED', 'Completado', 'Pago procesado'],
        ['REJECTED', 'Rechazado', 'Pago no válido'],
        ['CANCELLED', 'Cancelado', 'Pago anulado'],
      ],
    },
    {
      title: 'TIPO DE DOCUMENTO (DocumentType)',
      items: [
        ['DNI', 'DNI', 'Documento Nacional de Identidad'],
        ['CE', 'Carné de Extranjería', 'Para extranjeros'],
        ['RUC', 'RUC', 'Registro de empresas'],
      ],
    },
  ];

  sections.forEach((section) => {
    // Título de sección
    sheet.mergeCells(`A${rowNum}:C${rowNum}`);
    const sectionRow = sheet.getRow(rowNum);
    sectionRow.getCell(1).value = section.title;
    sectionRow.getCell(1).fill = STYLES.sectionTitle.fill;
    sectionRow.getCell(1).font = STYLES.sectionTitle.font;
    sectionRow.height = 22;
    rowNum++;

    // Headers
    const headerRow = sheet.getRow(rowNum);
    ['Valor en Sistema', 'Traducción', 'Descripción'].forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      setCellBorder(cell);
    });
    rowNum++;

    // Items
    section.items.forEach((item, idx) => {
      const row = sheet.getRow(rowNum);
      item.forEach((value, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = value;
        cell.font = { size: 10 };
        if (idx % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }
        setCellBorder(cell);
      });
      rowNum++;
    });

    rowNum++; // Espacio entre secciones
  });
}

// ============================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// ============================================================

export async function createSmartExcelWorkbook(sale: Sale, payments: Payment[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Terra Prime API';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Crear las hojas
  createClientSheet(workbook, sale);
  createSaleSheet(workbook, sale, payments);
  createInstallmentsSheet(workbook, sale, payments);
  createPaymentsSheet(workbook, sale, payments);
  createLegendSheet(workbook);

  return workbook;
}
