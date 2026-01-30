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
  console.log('🔧 Iniciando resolución de discrepancias menores (< S/ 30)...\n');

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
      // Extraer el monto: "Total Pagos (APPROVED/COMPLETED): S/ 5444.60"
      const match = line.match(/S\/\s*([\d.]+)/);
      if (match) {
        currentTotalPayments = parseFloat(match[1]);
      }
    } else if (line.startsWith('Total Cuotas Pagadas')) {
      // Extraer el monto: "Total Cuotas Pagadas (coutePaid): S/ 6222.40"
      const match = line.match(/S\/\s*([\d.]+)/);
      if (match) {
        currentTotalInstallments = parseFloat(match[1]);
      }
    } else if (line.startsWith('Diferencia:')) {
      // Extraer diferencia y guardar
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
      // Reset
      currentSaleId = null;
      currentFinancingId = null;
      currentTotalPayments = null;
      currentTotalInstallments = null;
    }
  }

  // Filtrar solo las discrepancias menores a 30
  const minorDiscrepancies = discrepancies.filter(d => Math.abs(d.difference) < 30);

  console.log(`📊 Total discrepancias en reporte: ${discrepancies.length}`);
  console.log(`📊 Discrepancias menores a S/ 30: ${minorDiscrepancies.length}\n`);

  if (minorDiscrepancies.length === 0) {
    console.log('✅ No hay discrepancias menores a S/ 30 para resolver.');
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

    for (const disc of minorDiscrepancies) {
      console.log(`\n🔍 Procesando Financing: ${disc.financingId}`);
      console.log(`   Diferencia: S/ ${disc.difference.toFixed(2)}`);
      resolutionLog.push(`\n${'='.repeat(80)}`);
      resolutionLog.push(`Financing ID: ${disc.financingId}`);
      resolutionLog.push(`Sale ID: ${disc.saleId}`);
      resolutionLog.push(`Diferencia: S/ ${disc.difference.toFixed(2)}`);

      try {
        // Obtener el total de pagos actual (fuente de verdad)
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

        // Obtener cuotas con pagos (coutePaid > 0), ordenadas por número de cuota descendente
        const paidInstallments = await dataSource.query(`
          SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending", status
          FROM financing_installments
          WHERE "financingId" = $1
            AND "coutePaid" > 0
          ORDER BY "numberCuote" DESC
        `, [disc.financingId]);

        if (paidInstallments.length === 0) {
          console.log(`   ⚠️ No hay cuotas con pagos para ajustar`);
          resolutionLog.push(`No hay cuotas con pagos para ajustar`);
          continue;
        }

        // Calcular suma actual de coutePaid
        const currentTotalPaid = paidInstallments.reduce((sum: number, inst: any) => {
          return sum + parseFloat(inst.coutePaid || '0');
        }, 0);

        const adjustmentNeeded = Number((totalPayments - currentTotalPaid).toFixed(2));

        console.log(`   💰 Total pagos: S/ ${totalPayments.toFixed(2)}`);
        console.log(`   📋 Total cuotas pagadas actual: S/ ${currentTotalPaid.toFixed(2)}`);
        console.log(`   🔧 Ajuste necesario: S/ ${adjustmentNeeded.toFixed(2)}`);

        resolutionLog.push(`Total pagos: S/ ${totalPayments.toFixed(2)}`);
        resolutionLog.push(`Total cuotas pagadas actual: S/ ${currentTotalPaid.toFixed(2)}`);
        resolutionLog.push(`Ajuste necesario: S/ ${adjustmentNeeded.toFixed(2)}`);

        if (Math.abs(adjustmentNeeded) < 0.01) {
          console.log(`   ✅ No se requiere ajuste`);
          resolutionLog.push(`No se requiere ajuste`);
          continue;
        }

        // Tomar la última cuota pagada (mayor número de cuota con pago)
        const lastPaidInstallment = paidInstallments[0];
        const currentCoutePaid = parseFloat(lastPaidInstallment.coutePaid || '0');
        const couteAmount = parseFloat(lastPaidInstallment.couteAmount || '0');

        // Calcular nuevos valores
        let newCoutePaid = Number((currentCoutePaid + adjustmentNeeded).toFixed(2));

        // Asegurar que no sea negativo
        if (newCoutePaid < 0) {
          console.log(`   ⚠️ El ajuste haría coutePaid negativo. Buscando otra cuota...`);

          // Buscar otra cuota donde podamos hacer el ajuste
          let adjusted = false;
          for (const inst of paidInstallments) {
            const instCoutePaid = parseFloat(inst.coutePaid || '0');
            const potentialNewPaid = Number((instCoutePaid + adjustmentNeeded).toFixed(2));

            if (potentialNewPaid >= 0) {
              const instCouteAmount = parseFloat(inst.couteAmount || '0');
              const newPending = Number((instCouteAmount - potentialNewPaid).toFixed(2));

              // Determinar nuevo estado
              let newStatus = inst.status;
              if (potentialNewPaid >= instCouteAmount) {
                newStatus = 'PAID';
              } else if (potentialNewPaid > 0) {
                newStatus = 'PENDING';
              }

              await dataSource.query(`
                UPDATE financing_installments
                SET "coutePaid" = $1, "coutePending" = $2, status = $3
                WHERE id = $4
              `, [potentialNewPaid, newPending, newStatus, inst.id]);

              console.log(`   ✅ Cuota ${inst.numberCuote} ajustada: coutePaid ${instCoutePaid} -> ${potentialNewPaid}`);
              resolutionLog.push(`Cuota ${inst.numberCuote} ajustada: coutePaid ${instCoutePaid} -> ${potentialNewPaid}`);
              adjusted = true;
              break;
            }
          }

          if (!adjusted) {
            console.log(`   ❌ No se pudo ajustar ninguna cuota`);
            resolutionLog.push(`ERROR: No se pudo ajustar ninguna cuota`);
            errorCount++;
            continue;
          }
        } else {
          // Ajustar la última cuota pagada
          const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

          // Determinar nuevo estado
          let newStatus = lastPaidInstallment.status;
          if (newCoutePaid >= couteAmount) {
            newStatus = 'PAID';
          } else if (newCoutePaid > 0 && newCoutePending > 0) {
            newStatus = 'PENDING';
          }

          await dataSource.query(`
            UPDATE financing_installments
            SET "coutePaid" = $1, "coutePending" = $2, status = $3
            WHERE id = $4
          `, [newCoutePaid, newCoutePending, newStatus, lastPaidInstallment.id]);

          console.log(`   ✅ Cuota ${lastPaidInstallment.numberCuote} ajustada: coutePaid ${currentCoutePaid} -> ${newCoutePaid}`);
          resolutionLog.push(`Cuota ${lastPaidInstallment.numberCuote} ajustada: coutePaid ${currentCoutePaid} -> ${newCoutePaid}`);
        }

        resolvedCount++;

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error procesando financing ${disc.financingId}:`, error);
        resolutionLog.push(`ERROR: ${error}`);
      }
    }

    // Guardar log de resolución
    const logPath = path.join(process.cwd(), 'reporte_resolucion_minimos.txt');
    let logContent = '='.repeat(80) + '\n';
    logContent += 'REPORTE DE RESOLUCIÓN DE DISCREPANCIAS MENORES (< S/ 30)\n';
    logContent += `Fecha: ${new Date().toLocaleString('es-PE')}\n`;
    logContent += '='.repeat(80) + '\n';
    logContent += `\nTotal procesados: ${resolvedCount}\n`;
    logContent += `Errores: ${errorCount}\n`;
    logContent += '\nDETALLE:\n';
    logContent += resolutionLog.join('\n');

    fs.writeFileSync(logPath, logContent);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Resolución completada`);
    console.log(`   Procesados correctamente: ${resolvedCount}`);
    console.log(`   Errores: ${errorCount}`);
    console.log(`\n📄 Log de resolución guardado en: ${logPath}`);
    console.log(`\n💡 Ejecuta 'pnpm run validate:amount' para verificar las correcciones`);

  } catch (error) {
    console.error('❌ Error durante la resolución:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión cerrada.');
  }
}

main();
