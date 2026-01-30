import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface Discrepancy {
  saleId: string;
  financingId: string;
  totalPayments: number;
  totalInstallmentsPaid: number;
  difference: number;
}

async function main() {
  console.log('🔧 Iniciando resolución de casos restantes (sin metadata)...\n');

  // Leer el archivo de discrepancias
  const reportPath = path.join(process.cwd(), 'reporte_discrepancias.txt');

  if (!fs.existsSync(reportPath)) {
    console.error('❌ No se encontró el archivo reporte_discrepancias.txt');
    console.error('   Ejecuta primero: pnpm run validate:amount');
    process.exit(1);
  }

  const reportContent = fs.readFileSync(reportPath, 'utf-8');

  // Extraer las discrepancias del archivo
  const discrepancies: Discrepancy[] = [];
  const lines = reportContent.split('\n');

  let currentSaleId: string | null = null;
  let currentFinancingId: string | null = null;
  let currentTotalPayments: number | null = null;
  let currentTotalInstallments: number | null = null;

  for (const line of lines) {
    if (line.startsWith('Sale ID: ')) {
      currentSaleId = line.replace('Sale ID: ', '').trim();
    } else if (line.startsWith('Financing ID: ')) {
      currentFinancingId = line.replace('Financing ID: ', '').trim();
    } else if (line.startsWith('Total Pagos')) {
      const match = line.match(/S\/\s*([\d.]+)/);
      if (match) {
        currentTotalPayments = parseFloat(match[1]);
      }
    } else if (line.startsWith('Total Cuotas Pagadas')) {
      const match = line.match(/S\/\s*([\d.]+)/);
      if (match) {
        currentTotalInstallments = parseFloat(match[1]);
      }
    } else if (line.startsWith('Diferencia:')) {
      const match = line.match(/S\/\s*(-?[\d.]+)/);
      if (match && currentSaleId && currentFinancingId && currentTotalPayments !== null && currentTotalInstallments !== null) {
        const difference = parseFloat(match[1]);
        discrepancies.push({
          saleId: currentSaleId,
          financingId: currentFinancingId,
          totalPayments: currentTotalPayments,
          totalInstallmentsPaid: currentTotalInstallments,
          difference: difference,
        });
      }
      currentSaleId = null;
      currentFinancingId = null;
      currentTotalPayments = null;
      currentTotalInstallments = null;
    }
  }

  console.log(`📊 Discrepancias encontradas en reporte: ${discrepancies.length}\n`);

  if (discrepancies.length === 0) {
    console.log('✅ No hay discrepancias para resolver.');
    process.exit(0);
  }

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

    let resolvedCount = 0;
    let errorCount = 0;
    const resolutionLog: string[] = [];

    for (const disc of discrepancies) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔍 Procesando Financing: ${disc.financingId}`);
      console.log(`   Sale ID: ${disc.saleId}`);
      resolutionLog.push(`\n${'='.repeat(80)}`);
      resolutionLog.push(`Financing ID: ${disc.financingId}`);
      resolutionLog.push(`Sale ID: ${disc.saleId}`);

      try {
        // 1. Obtener el total de pagos válidos
        const paymentsResult = await dataSource.query(`
          SELECT COALESCE(SUM(p.amount), 0) as total_payments
          FROM payments p
          INNER JOIN payment_configs pc ON p.payment_config_id = pc.id
          WHERE p."relatedEntityType" = 'financingInstallments'
            AND p."relatedEntityId" = $1
            AND p.status IN ('APPROVED', 'COMPLETED')
            AND pc.code = 'FINANCING_INSTALLMENTS_PAYMENT'
        `, [disc.financingId]);

        const totalPayments = parseFloat(paymentsResult[0]?.total_payments || '0');
        console.log(`   💰 Total pagos válidos: S/ ${totalPayments.toFixed(2)}`);
        resolutionLog.push(`Total pagos: S/ ${totalPayments.toFixed(2)}`);

        // 2. Obtener todas las cuotas ordenadas por número
        const installments = await dataSource.query(`
          SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending",
                 "lateFeeAmount", "lateFeeAmountPaid", "lateFeeAmountPending", status,
                 "expectedPaymentDate"
          FROM financing_installments
          WHERE "financingId" = $1
          ORDER BY "numberCuote" ASC
        `, [disc.financingId]);

        console.log(`   📋 Cuotas encontradas: ${installments.length}`);
        resolutionLog.push(`Cuotas: ${installments.length}`);

        // 3. Resetear TODAS las cuotas a estado inicial
        console.log(`   🔄 Reseteando todas las cuotas...`);
        resolutionLog.push(`Reseteando cuotas...`);

        for (const installment of installments) {
          const couteAmount = parseFloat(installment.couteAmount || '0');
          const lateFeeAmount = parseFloat(installment.lateFeeAmount || '0');

          // Determinar estado inicial
          let newStatus = 'PENDING';
          const expectedDate = new Date(installment.expectedPaymentDate);
          const now = new Date();
          if (expectedDate < now && lateFeeAmount > 0) {
            newStatus = 'EXPIRED';
          }

          await dataSource.query(`
            UPDATE financing_installments
            SET "coutePaid" = 0,
                "coutePending" = $1,
                "lateFeeAmountPaid" = 0,
                "lateFeeAmountPending" = $2,
                status = $3
            WHERE id = $4
          `, [couteAmount, lateFeeAmount, newStatus, installment.id]);
        }

        // 4. Aplicar el monto total de pagos secuencialmente a las cuotas
        console.log(`   📝 Aplicando S/ ${totalPayments.toFixed(2)} secuencialmente a las cuotas...`);
        resolutionLog.push(`Aplicando monto secuencialmente...`);

        let remainingAmount = totalPayments;

        for (const installment of installments) {
          if (remainingAmount <= 0) break;

          const couteAmount = parseFloat(installment.couteAmount || '0');

          // Calcular cuánto aplicar a esta cuota
          const toApply = Math.min(remainingAmount, couteAmount);
          const newCoutePaid = Number(toApply.toFixed(2));
          const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

          // Determinar estado
          let newStatus = 'PENDING';
          if (newCoutePending <= 0) {
            newStatus = 'PAID';
          }

          await dataSource.query(`
            UPDATE financing_installments
            SET "coutePaid" = $1, "coutePending" = $2, status = $3
            WHERE id = $4
          `, [newCoutePaid, newCoutePending, newStatus, installment.id]);

          if (toApply > 0) {
            console.log(`      Cuota ${installment.numberCuote}: S/ ${toApply.toFixed(2)} (${newStatus})`);
            resolutionLog.push(`   Cuota ${installment.numberCuote}: S/ ${toApply.toFixed(2)}`);
          }

          remainingAmount = Number((remainingAmount - toApply).toFixed(2));
        }

        // 5. Verificar si quedó monto sin aplicar
        if (remainingAmount > 0.01) {
          console.log(`   ⚠️ Monto sin aplicar: S/ ${remainingAmount.toFixed(2)} (excede todas las cuotas)`);
          resolutionLog.push(`⚠️ Monto excedente: S/ ${remainingAmount.toFixed(2)}`);
        }

        // 6. Validación final
        const finalResult = await dataSource.query(`
          SELECT COALESCE(SUM("coutePaid"), 0) as total_paid
          FROM financing_installments
          WHERE "financingId" = $1
        `, [disc.financingId]);

        const finalTotalPaid = parseFloat(finalResult[0]?.total_paid || '0');
        const finalDiff = Number((totalPayments - finalTotalPaid).toFixed(2));

        console.log(`   ✅ Validación final:`);
        console.log(`      Total pagos: S/ ${totalPayments.toFixed(2)}`);
        console.log(`      Total cuotas pagadas: S/ ${finalTotalPaid.toFixed(2)}`);
        console.log(`      Diferencia: S/ ${finalDiff.toFixed(2)}`);

        resolutionLog.push(`Validación final:`);
        resolutionLog.push(`   Total pagos: S/ ${totalPayments.toFixed(2)}`);
        resolutionLog.push(`   Total cuotas: S/ ${finalTotalPaid.toFixed(2)}`);
        resolutionLog.push(`   Diferencia: S/ ${finalDiff.toFixed(2)}`);

        if (Math.abs(finalDiff) <= 0.01) {
          console.log(`   ✅ ¡Discrepancia resuelta!`);
          resolutionLog.push(`✅ RESUELTO`);
        } else {
          console.log(`   ⚠️ Diferencia pendiente (monto excede cuotas disponibles)`);
          resolutionLog.push(`⚠️ Pendiente: monto excede cuotas`);
        }

        resolvedCount++;

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error procesando financing ${disc.financingId}:`, error);
        resolutionLog.push(`ERROR: ${error}`);
      }
    }

    // Guardar log de resolución
    const logPath = path.join(process.cwd(), 'reporte_resolucion_otros.txt');
    let logContent = '='.repeat(80) + '\n';
    logContent += 'REPORTE DE RESOLUCIÓN - OTROS CASOS (SIN METADATA)\n';
    logContent += `Fecha: ${new Date().toLocaleString('es-PE')}\n`;
    logContent += '='.repeat(80) + '\n';
    logContent += `\nTotal procesados: ${resolvedCount}\n`;
    logContent += `Errores: ${errorCount}\n`;
    logContent += '\nDETALLE:\n';
    logContent += resolutionLog.join('\n');

    fs.writeFileSync(logPath, logContent);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Resolución completada`);
    console.log(`   Procesados: ${resolvedCount}`);
    console.log(`   Errores: ${errorCount}`);
    console.log(`\n📄 Log guardado en: ${logPath}`);
    console.log(`\n💡 Ejecuta 'pnpm run validate:amount' para verificar`);

  } catch (error) {
    console.error('❌ Error durante la resolución:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión cerrada.');
  }
}

main();
