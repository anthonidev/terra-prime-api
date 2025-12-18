import { Sale } from '../entities/sale.entity';
import { Payment } from 'src/admin-payments/payments/entities/payment.entity';
import { PaymentDetails } from 'src/admin-payments/payments/entities/payment-details.entity';
import { SecondaryClient } from 'src/admin-sales/secondary-client/entities/secondary-client.entity';

// FORMATO EXACTO basado en el Excel real: "Copia de Plantilla(2).xlsx" - Hoja1
// Total: 96 columnas (0-95) - sin incluir las columnas de totales (96-102)
// Mapeo según migrations.service.ts:

const HEADERS = [
  '',                           // Col 0 - excelCode (línea 98 migrations)
  '#',                          // Col 1
  'Proyecto',                   // Col 2 - project.name (línea 931)
  'Etapa',                      // Col 3 - stage.name (línea 936)
  '',                           // Col 4
  '',                           // Col 5
  'Bloque',                     // Col 6 - block.name (línea 940)
  'Lote',                       // Col 7 - lot.name (línea 944)
  'Área',                       // Col 8 - lot.area (línea 945)
  'Precio del Lote',            // Col 9 - lot.lotPrice (línea 946)
  'Precio de Urbanización',     // Col 10 - lot.urbanizationPrice (línea 947)
  'Estado',                     // Col 11
  'TIPO DE DOCUMENTO',          // Col 12 - client documentType (línea 961)
  'DOCUMENTO',                  // Col 13 - client document (línea 960)
  'NOMBRE',                     // Col 14 - client fullName (línea 953)
  'TIPO DE DOCUMENTO',          // Col 15 - secondary documentType (línea 982)
  'DOCUMENTO',                  // Col 16 - secondary document (línea 972)
  'NOMBRE',                     // Col 17 - secondary fullName (línea 975)
  '',                           // Col 18
  'MZ',                         // Col 19
  'LOTE',                       // Col 20
  'AREA',                       // Col 21
  'ESTADO',                     // Col 22
  'FECHA HOJA DE RADICACION',   // Col 23
  'FECHA DE CONTRATO',          // Col 24 - contractDate (línea 991)
  'MONEDA',                     // Col 25 - currency (línea 932, 949)
  'PRECIO',                     // Col 26 - totalAmount (línea 990)
  'NUMERO DE CUOTAS',           // Col 27
  'CUOTA',                      // Col 28 - couteNumberExcel (línea 1046)
  'FECHA DE VENCIMIENTO',       // Col 29 - expectedPaymentDate (línea 1048)
  'IMPORTE DE CUOTA',           // Col 30 - couteAmount (línea 1047)
  'MORA',                       // Col 31 - lateFeeAmount (línea 1049)
  'TIPO DE DOCUMENTO',          // Col 32
  'FECHA',                      // Col 33
  'DNI/RUC',                    // Col 34
  'NOMBRE/RAZON SOCIAL',        // Col 35
  'NUMERO',                     // Col 36 - numberTicket (línea 1051)
  'IMPORTE $',                  // Col 37
  'IMPORTE S/',                 // Col 38
  'DETALLE',                    // Col 39 - detalle (línea 1050)
  'TIPO DE DOCUMENTO',          // Col 40
  'FECHA',                      // Col 41
  'DNI/RUC',                    // Col 42
  'NOMBRE/RAZON SOCIAL',        // Col 43
  'NUMERO',                     // Col 44
  'IMPORTE $',                  // Col 45
  'IMPORTE S/',                 // Col 46
  'DETALLE',                    // Col 47 - detalle alternativo (línea 1050)
  // 8 grupos de abonos: baseCol = 48 + (i * 6) (línea 1156)
  'FECHA DE ABONO',             // Col 48 - transactionDate (línea 1158)
  'NUMERO DE OPERACIÓN',        // Col 49 - transactionReference (línea 1159)
  'ABONADO S/',                 // Col 50 - amountPEN (línea 1160)
  'TIPO DE CAMBIO',             // Col 51
  'ABONADO $',                  // Col 52 - amountUSD (línea 1161)
  'OBS.',                       // Col 53
  'FECHA DE ABONO',             // Col 54 (48 + 1*6)
  'NUMERO DE OPERACIÓN',        // Col 55
  'ABONADO S/',                 // Col 56
  'TIPO DE CAMBIO',             // Col 57
  'ABONADO $',                  // Col 58
  'OBS.',                       // Col 59
  'FECHA DE ABONO',             // Col 60 (48 + 2*6)
  'NUMERO DE OPERACIÓN',        // Col 61
  'ABONADO S/',                 // Col 62
  'TIPO DE CAMBIO',             // Col 63
  'ABONADO $',                  // Col 64
  'OBS.',                       // Col 65
  'FECHA DE ABONO',             // Col 66 (48 + 3*6)
  'NUMERO DE OPERACIÓN',        // Col 67
  'ABONADO S/',                 // Col 68
  'TIPO DE CAMBIO',             // Col 69
  'ABONADO $',                  // Col 70
  'OBS.',                       // Col 71
  'FECHA DE ABONO',             // Col 72 (48 + 4*6)
  'NUMERO DE OPERACIÓN',        // Col 73
  'ABONADO S/',                 // Col 74
  'TIPO DE CAMBIO',             // Col 75
  'ABONADO $',                  // Col 76
  'OBS.',                       // Col 77
  'FECHA DE ABONO',             // Col 78 (48 + 5*6)
  'NUMERO DE OPERACIÓN',        // Col 79
  'ABONADO S/',                 // Col 80
  'TIPO DE CAMBIO',             // Col 81
  'ABONADO $',                  // Col 82
  'OBS.',                       // Col 83
  'FECHA DE ABONO',             // Col 84 (48 + 6*6)
  'NUMERO DE OPERACIÓN',        // Col 85
  'ABONADO S/',                 // Col 86
  'TIPO DE CAMBIO',             // Col 87
  'ABONADO $',                  // Col 88
  'OBS.',                       // Col 89
  'FECHA DE ABONO',             // Col 90 (48 + 7*6)
  'NUMERO DE OPERACIÓN',        // Col 91
  'ABONADO S/',                 // Col 92
  'TIPO DE CAMBIO',             // Col 93
  'ABONADO $',                  // Col 94
  'OBS.',                       // Col 95
];

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function createBaseRow(sale: Sale): any[] {
  const row = new Array(HEADERS.length).fill('');
  const secondaryClient = sale.secondaryClientSales?.[0]?.secondaryClient as SecondaryClient | undefined;

  // MAPEO EXACTO según migrations.service.ts
  row[0] = sale.metadata?.['Codigo'] || '';                                      // Col 0 (línea 98)
  row[1] = 1;                                                                    // Col 1
  row[2] = sale.lot.block.stage.project.name;                                    // Col 2 (línea 931)
  row[3] = sale.lot.block.stage.name;                                            // Col 3 (línea 936)
  row[6] = sale.lot.block.name;                                                  // Col 6 (línea 940)
  row[7] = sale.lot.name;                                                        // Col 7 (línea 944)
  row[8] = sale.lot.area;                                                        // Col 8 (línea 945)
  row[9] = sale.lot.lotPrice;                                                    // Col 9 (línea 946)
  row[10] = sale.lot.urbanizationPrice;                                          // Col 10 (línea 947)
  row[11] = 'VENDIDO';                                                           // Col 11
  row[12] = sale.client.lead.documentType;                                       // Col 12 (línea 961)
  row[13] = sale.client.lead.document;                                           // Col 13 (línea 960)
  row[14] = `${sale.client.lead.firstName} ${sale.client.lead.lastName}`.trim(); // Col 14 (línea 953)

  if (secondaryClient) {
    row[15] = secondaryClient.documentType;                                      // Col 15 (línea 982)
    row[16] = secondaryClient.document;                                          // Col 16 (línea 972)
    row[17] = `${secondaryClient.firstName} ${secondaryClient.lastName}`.trim(); // Col 17 (línea 975)
  }

  // Repetir Bloque/Lote en MZ/LOTE y otros campos
  row[19] = sale.lot.block.name;                                                 // Col 19 (MZ - mismo que Bloque)
  row[20] = sale.lot.name;                                                       // Col 20 (LOTE - mismo que Lote)
  row[21] = sale.lot.area;                                                       // Col 21 (AREA - mismo que Área)
  row[22] = 'CUADRADO';                                                          // Col 22 (ESTADO)

  row[24] = formatDate(sale.contractDate);                                       // Col 24 (línea 991)
  row[25] = sale.lot.currency === 'USD' ? 'DOLAR' : sale.lot.currency;           // Col 25 (línea 932, 949)
  row[26] = sale.totalAmount;                                                    // Col 26 (línea 990)

  return row;
}

function addPaymentDetailsToRow(row: any[], payments: Payment[], currency: 'USD' | 'PEN', sale: Sale) {
  const maxPayments = 8;

  payments.forEach((payment, index) => {
    if (index >= maxPayments) return;
    if (!payment.details || payment.details.length === 0) return;

    const detail: PaymentDetails = payment.details[0];

    // baseCol = 48 + (i * 6) - según línea 1156
    const baseCol = 48 + (index * 6);

    row[baseCol] = formatDate(detail.transactionDate);     // FECHA DE ABONO (línea 1158)
    row[baseCol + 1] = detail.transactionReference;         // NUMERO DE OPERACIÓN (línea 1159)
    row[baseCol + 2] = currency === 'PEN' ? detail.amount : ''; // ABONADO S/ (línea 1160)
    row[baseCol + 4] = currency === 'USD' ? detail.amount : ''; // ABONADO $ (línea 1161)

    // Primera fila de pago: agregar número, detalle y datos del cliente
    if (index === 0) {
      // Datos del pago
      row[36] = payment.numberTicket;   // NUMERO (línea 1051)
      row[39] = payment.observation;    // DETALLE (línea 1050)

      // Datos del cliente en las columnas de pago (cols 34-35)
      row[34] = sale.client.lead.document;  // DNI/RUC
      row[35] = `${sale.client.lead.firstName} ${sale.client.lead.lastName}`.trim(); // NOMBRE/RAZON SOCIAL
    }
  });
}

export function transformSaleToExcelRows(sale: Sale, allPayments: Payment[]): any[][] {
  const rows: any[][] = [HEADERS];
  const currency = sale.lot.currency;
  const financing = sale.financing;

  // Pagos de reserva o inicial - CREAR UNA FILA POR CADA PAGO
  const initialPayments = allPayments.filter(p =>
    p.relatedEntityType === 'financing' || p.relatedEntityType === 'reservation'
  );

  // Crear UNA FILA POR CADA PAGO de cuota 0 (cada pago hacia la inicial/separación)
  for (const payment of initialPayments) {
    const initialRow = createBaseRow(sale);
    initialRow[28] = 0; // CUOTA 0 (línea 1046)

    // El IMPORTE DE CUOTA es el monto de ESTE pago específico, no el total
    initialRow[30] = Number(payment.amount);  // IMPORTE DE CUOTA (línea 1047)

    // Determinar si es SEPARACION o CANCELACION según el tipo
    if (payment.relatedEntityType === 'reservation') {
      initialRow[39] = 'SEPARACION';  // DETALLE (línea 1050)
    } else {
      initialRow[39] = 'CANCELACION CUOTA INICIAL';  // DETALLE (línea 1050)
    }

    // Agregar los detalles de pago (abonos) de este pago específico
    addPaymentDetailsToRow(initialRow, [payment], currency, sale);
    rows.push(initialRow);
  }

  // Filas de cuotas regulares (1, 2, 3...)
  if (financing && financing.financingInstallments) {
    const sortedInstallments = [...financing.financingInstallments].sort(
      (a, b) => a.numberCuote - b.numberCuote
    );

    for (const installment of sortedInstallments) {
      const installmentRow = createBaseRow(sale);

      installmentRow[28] = installment.numberCuote;                      // CUOTA (línea 1046)
      installmentRow[29] = formatDate(installment.expectedPaymentDate);  // FECHA DE VENCIMIENTO (línea 1048)
      installmentRow[30] = installment.couteAmount;                      // IMPORTE DE CUOTA (línea 1047)
      installmentRow[31] = installment.lateFeeAmount;                    // MORA (línea 1049)

      // Buscar pagos asociados a esta cuota
      const relatedPayments = allPayments.filter(p => {
        const metadata = p.metadata as any;
        return p.relatedEntityType === 'financingInstallments' &&
          metadata?.['Cuota referencia Excel'] === installment.numberCuote;
      });

      addPaymentDetailsToRow(installmentRow, relatedPayments, currency, sale);
      rows.push(installmentRow);
    }
  }

  // Si no hay filas de datos, crear al menos una fila base
  if (rows.length === 1) {
    const singleRow = createBaseRow(sale);
    if (initialPayments.length > 0) {
      addPaymentDetailsToRow(singleRow, initialPayments, currency, sale);
    }
    rows.push(singleRow);
  }

  return rows;
}
