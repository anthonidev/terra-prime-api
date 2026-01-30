import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface DiscrepancyReport {
  saleId: string;
  financingId: string;
  totalPayments: number;
  totalInstallmentsPaid: number;
  difference: number;
}

async function main() {
  console.log('🔍 Iniciando validación de montos de pagos vs cuotas pagadas...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida\n');

    // Obtener todas las ventas con financing
    const salesWithFinancing = await dataSource.query(`
      SELECT
        s.id as sale_id,
        f.id as financing_id
      FROM sales s
      INNER JOIN financing f ON s.financing_id = f.id
      WHERE s.financing_id IS NOT NULL
      ORDER BY s."createdAt" DESC
    `);

    console.log(`📊 Total de ventas con financiamiento: ${salesWithFinancing.length}\n`);

    const discrepancies: DiscrepancyReport[] = [];
    let processedCount = 0;

    for (const sale of salesWithFinancing) {
      processedCount++;

      // Sumar pagos aprobados/completados de tipo financingInstallments para este financing
      const paymentsResult = await dataSource.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_payments
        FROM payments p
        INNER JOIN payment_configs pc ON p.payment_config_id = pc.id
        WHERE p."relatedEntityType" = 'financingInstallments'
          AND p."relatedEntityId" = $1
          AND p.status IN ('APPROVED', 'COMPLETED')
          AND pc.code = 'FINANCING_INSTALLMENTS_PAYMENT'
      `, [sale.financing_id]);

      const totalPayments = parseFloat(paymentsResult[0]?.total_payments || '0');

      // Sumar coutePaid de todas las cuotas del financing
      const installmentsResult = await dataSource.query(`
        SELECT COALESCE(SUM(fi."coutePaid"), 0) as total_installments_paid
        FROM financing_installments fi
        WHERE fi."financingId" = $1
      `, [sale.financing_id]);

      const totalInstallmentsPaid = parseFloat(installmentsResult[0]?.total_installments_paid || '0');

      // Comparar con tolerancia de 0.01 para evitar problemas de redondeo
      const difference = Math.abs(totalPayments - totalInstallmentsPaid);

      if (difference > 0.01) {
        discrepancies.push({
          saleId: sale.sale_id,
          financingId: sale.financing_id,
          totalPayments: totalPayments,
          totalInstallmentsPaid: totalInstallmentsPaid,
          difference: Number((totalPayments - totalInstallmentsPaid).toFixed(2)),
        });
      }

      // Mostrar progreso cada 100 ventas
      if (processedCount % 100 === 0) {
        console.log(`⏳ Procesadas ${processedCount}/${salesWithFinancing.length} ventas...`);
      }
    }

    console.log(`\n✅ Validación completada. Procesadas ${processedCount} ventas.`);
    console.log(`⚠️  Discrepancias encontradas: ${discrepancies.length}\n`);

    // Generar reporte
    const reportPath = path.join(process.cwd(), 'reporte_discrepancias.txt');

    let reportContent = '='.repeat(80) + '\n';
    reportContent += 'REPORTE DE DISCREPANCIAS - PAGOS vs CUOTAS PAGADAS\n';
    reportContent += `Fecha de generación: ${new Date().toLocaleString('es-PE')}\n`;
    reportContent += '='.repeat(80) + '\n\n';

    if (discrepancies.length === 0) {
      reportContent += '✅ No se encontraron discrepancias.\n';
      reportContent += 'Todos los montos de pagos coinciden con las cuotas pagadas.\n';
    } else {
      reportContent += `Total de ventas con discrepancias: ${discrepancies.length}\n\n`;
      reportContent += '-'.repeat(80) + '\n';
      reportContent += 'DETALLE DE DISCREPANCIAS:\n';
      reportContent += '-'.repeat(80) + '\n\n';

      for (const disc of discrepancies) {
        reportContent += `Sale ID: ${disc.saleId}\n`;
        reportContent += `Financing ID: ${disc.financingId}\n`;
        reportContent += `Total Pagos (APPROVED/COMPLETED): S/ ${disc.totalPayments.toFixed(2)}\n`;
        reportContent += `Total Cuotas Pagadas (coutePaid): S/ ${disc.totalInstallmentsPaid.toFixed(2)}\n`;
        reportContent += `Diferencia: S/ ${disc.difference.toFixed(2)}\n`;
        reportContent += '-'.repeat(40) + '\n\n';
      }

      // Resumen al final
      reportContent += '='.repeat(80) + '\n';
      reportContent += 'RESUMEN\n';
      reportContent += '='.repeat(80) + '\n';

      const totalDiffPositive = discrepancies
        .filter(d => d.difference > 0)
        .reduce((sum, d) => sum + d.difference, 0);

      const totalDiffNegative = discrepancies
        .filter(d => d.difference < 0)
        .reduce((sum, d) => sum + Math.abs(d.difference), 0);

      reportContent += `Ventas con pagos > cuotas: ${discrepancies.filter(d => d.difference > 0).length} (Total: S/ ${totalDiffPositive.toFixed(2)})\n`;
      reportContent += `Ventas con pagos < cuotas: ${discrepancies.filter(d => d.difference < 0).length} (Total: S/ ${totalDiffNegative.toFixed(2)})\n`;
    }

    fs.writeFileSync(reportPath, reportContent);
    console.log(`📄 Reporte generado en: ${reportPath}`);

    // También mostrar resumen en consola
    if (discrepancies.length > 0) {
      console.log('\n📋 Primeras 10 discrepancias:');
      console.log('-'.repeat(100));
      console.log(
        'Sale ID'.padEnd(40) +
        'Total Pagos'.padStart(15) +
        'Total Cuotas'.padStart(15) +
        'Diferencia'.padStart(15)
      );
      console.log('-'.repeat(100));

      for (const disc of discrepancies.slice(0, 10)) {
        console.log(
          disc.saleId.padEnd(40) +
          `S/ ${disc.totalPayments.toFixed(2)}`.padStart(15) +
          `S/ ${disc.totalInstallmentsPaid.toFixed(2)}`.padStart(15) +
          `S/ ${disc.difference.toFixed(2)}`.padStart(15)
        );
      }

      if (discrepancies.length > 10) {
        console.log(`\n... y ${discrepancies.length - 10} más. Ver reporte completo.`);
      }
    }

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión cerrada.');
  }
}

main();
