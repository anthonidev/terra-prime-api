import * as ExcelJS from 'exceljs';
import { FinancingInstallments } from 'src/admin-sales/financing/entities/financing-installments.entity';
import { Sale } from '../entities/sale.entity';
import { Financing } from 'src/admin-sales/financing/entities/financing.entity';

interface AmendmentTotals {
  totalCouteAmount: number;
  totalPaid: number;
  totalPending: number;
  totalLateFee: number;
  totalLateFeePending: number;
  totalLateFeePaid: number;
}

const COLORS = {
  HEADER_BG: 'FF2B579A',
  HEADER_FONT: 'FFFFFFFF',
  PAID_BG: 'FFC6EFCE',
  PAID_FONT: 'FF006100',
  PENDING_BG: 'FFFFF2CC',
  PENDING_FONT: 'FF9C5700',
  EXPIRED_BG: 'FFFFC7CE',
  EXPIRED_FONT: 'FF9C0006',
  TOTAL_BG: 'FFD9E1F2',
};

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function createAmendmentHistoryExcel(
  sale: Sale,
  financing: Financing,
  installments: FinancingInstallments[],
  totals: AmendmentTotals,
  additionalAmount: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Terra Prime API';
  workbook.created = new Date();

  // ===== TAB 1: RESUMEN DE LA ADENDA =====
  const summarySheet = workbook.addWorksheet('Resumen Adenda');

  // Título
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'HISTORIAL DE ADENDA - FINANCIAMIENTO';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.HEADER_BG } };
  titleCell.alignment = { horizontal: 'center' };

  // Fecha de generación
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Fecha de generación: ${formatDate(new Date())}`;
  summarySheet.getCell('A2').font = { italic: true, size: 10 };

  // Información de la venta
  let row = 4;
  summarySheet.getCell(`A${row}`).value = 'INFORMACIÓN DE LA VENTA';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  summarySheet.mergeCells(`A${row}:D${row}`);
  row++;

  const saleInfo = [
    ['ID Venta', sale.id],
    ['Cliente', sale.client?.lead ? `${sale.client.lead.firstName} ${sale.client.lead.lastName}` : 'N/A'],
    ['Documento', sale.client?.lead?.document || 'N/A'],
    ['Proyecto', sale.lot?.block?.stage?.project?.name || 'N/A'],
    ['Lote', `${sale.lot?.block?.name || ''} - ${sale.lot?.name || ''}`],
    ['Monto Total Venta', formatCurrency(Number(sale.totalAmount))],
    ['Estado', sale.status],
  ];

  for (const [label, value] of saleInfo) {
    summarySheet.getCell(`A${row}`).value = label;
    summarySheet.getCell(`A${row}`).font = { bold: true };
    summarySheet.getCell(`B${row}`).value = value;
    row++;
  }

  // Información del financiamiento
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'INFORMACIÓN DEL FINANCIAMIENTO';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  summarySheet.mergeCells(`A${row}:D${row}`);
  row++;

  const financingInfo = [
    ['ID Financiamiento', financing.id],
    ['Tipo', financing.financingType],
    ['Monto Inicial', formatCurrency(Number(financing.initialAmount))],
    ['Tasa de Interés', `${financing.interestRate || 0}%`],
    ['Cantidad de Cuotas', financing.quantityCoutes],
  ];

  for (const [label, value] of financingInfo) {
    summarySheet.getCell(`A${row}`).value = label;
    summarySheet.getCell(`A${row}`).font = { bold: true };
    summarySheet.getCell(`B${row}`).value = value;
    row++;
  }

  // Totales antes de la adenda
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'TOTALES ANTES DE LA ADENDA';
  summarySheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  summarySheet.mergeCells(`A${row}:D${row}`);
  row++;

  const totalsInfo = [
    ['Total Monto Cuotas', formatCurrency(totals.totalCouteAmount)],
    ['Total Pagado', formatCurrency(totals.totalPaid)],
    ['Total Pendiente', formatCurrency(totals.totalPending)],
    ['Total Mora', formatCurrency(totals.totalLateFee)],
    ['Total Mora Pendiente', formatCurrency(totals.totalLateFeePending)],
    ['Total Mora Pagado', formatCurrency(totals.totalLateFeePaid)],
  ];

  for (const [label, value] of totalsInfo) {
    summarySheet.getCell(`A${row}`).value = label;
    summarySheet.getCell(`A${row}`).font = { bold: true };
    summarySheet.getCell(`B${row}`).value = value;
    row++;
  }

  // Monto adicional de la adenda
  row += 2;
  summarySheet.getCell(`A${row}`).value = 'MONTO ADICIONAL ADENDA';
  summarySheet.getCell(`A${row}`).font = { bold: true };
  summarySheet.getCell(`B${row}`).value = formatCurrency(additionalAmount);
  summarySheet.getCell(`B${row}`).font = {
    bold: true,
    color: { argb: additionalAmount >= 0 ? COLORS.PAID_FONT : COLORS.EXPIRED_FONT }
  };

  // Ajustar anchos
  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 40;
  summarySheet.getColumn('C').width = 20;
  summarySheet.getColumn('D').width = 20;

  // ===== TAB 2: DETALLE DE CUOTAS =====
  const installmentsSheet = workbook.addWorksheet('Cuotas Anteriores');

  // Encabezados
  const headers = [
    'N° Cuota',
    'Fecha Vencimiento',
    'Monto Cuota',
    'Monto Pagado',
    'Monto Pendiente',
    'Mora Total',
    'Mora Pendiente',
    'Mora Pagada',
    'Estado',
  ];

  const headerRow = installmentsSheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.HEADER_BG },
    };
    cell.font = { bold: true, color: { argb: COLORS.HEADER_FONT } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Ordenar cuotas por número
  const sortedInstallments = [...installments].sort((a, b) => a.numberCuote - b.numberCuote);

  // Agregar filas de cuotas
  for (const inst of sortedInstallments) {
    const dataRow = installmentsSheet.addRow([
      inst.numberCuote,
      formatDate(inst.expectedPaymentDate),
      Number(inst.couteAmount),
      Number(inst.coutePaid),
      Number(inst.coutePending),
      Number(inst.lateFeeAmount) || 0,
      Number(inst.lateFeeAmountPending) || 0,
      Number(inst.lateFeeAmountPaid) || 0,
      inst.status,
    ]);

    // Colorear según estado
    let bgColor = COLORS.PENDING_BG;
    let fontColor = COLORS.PENDING_FONT;

    if (inst.status === 'PAID') {
      bgColor = COLORS.PAID_BG;
      fontColor = COLORS.PAID_FONT;
    } else if (inst.status === 'EXPIRED') {
      bgColor = COLORS.EXPIRED_BG;
      fontColor = COLORS.EXPIRED_FONT;
    }

    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Formato numérico para columnas de montos
      if (colNumber >= 3 && colNumber <= 8) {
        cell.numFmt = '#,##0.00';
      }

      // Color para la columna de estado
      if (colNumber === 9) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.font = { color: { argb: fontColor }, bold: true };
      }
    });
  }

  // Fila de totales
  const totalRow = installmentsSheet.addRow([
    'TOTALES',
    '',
    totals.totalCouteAmount,
    totals.totalPaid,
    totals.totalPending,
    totals.totalLateFee,
    totals.totalLateFeePending,
    totals.totalLateFeePaid,
    '',
  ]);

  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.TOTAL_BG },
    };
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    if (colNumber >= 3 && colNumber <= 8) {
      cell.numFmt = '#,##0.00';
    }
  });

  // Ajustar anchos
  installmentsSheet.getColumn(1).width = 12;
  installmentsSheet.getColumn(2).width = 18;
  installmentsSheet.getColumn(3).width = 15;
  installmentsSheet.getColumn(4).width = 15;
  installmentsSheet.getColumn(5).width = 15;
  installmentsSheet.getColumn(6).width = 12;
  installmentsSheet.getColumn(7).width = 15;
  installmentsSheet.getColumn(8).width = 12;
  installmentsSheet.getColumn(9).width = 12;

  return workbook;
}
