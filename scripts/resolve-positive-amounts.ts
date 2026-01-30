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
  console.log('🔧 Iniciando resolución de discrepancias positivas (pagos > cuotas)...\n');

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

  // Filtrar solo las discrepancias positivas (pagos > cuotas)
  const positiveDiscrepancies = discrepancies.filter(d => d.difference > 0);

  console.log(`📊 Total discrepancias en reporte: ${discrepancies.length}`);
  console.log(`📊 Discrepancias positivas (pagos > cuotas): ${positiveDiscrepancies.length}\n`);

  if (positiveDiscrepancies.length === 0) {
    console.log('✅ No hay discrepancias positivas para resolver.');
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

    for (const disc of positiveDiscrepancies) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔍 Procesando Financing: ${disc.financingId}`);
      console.log(`   Diferencia inicial: S/ ${disc.difference.toFixed(2)} (pagos > cuotas)`);
      resolutionLog.push(`\n${'='.repeat(80)}`);
      resolutionLog.push(`Financing ID: ${disc.financingId}`);
      resolutionLog.push(`Sale ID: ${disc.saleId}`);
      resolutionLog.push(`Diferencia inicial: S/ ${disc.difference.toFixed(2)}`);

      try {
        // 1. Obtener todas las cuotas del financing
        const installments = await dataSource.query(`
          SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending",
                 "lateFeeAmount", "lateFeeAmountPaid", "lateFeeAmountPending", status
          FROM financing_installments
          WHERE "financingId" = $1
          ORDER BY "numberCuote" ASC
        `, [disc.financingId]);

        console.log(`   📋 Cuotas encontradas: ${installments.length}`);
        resolutionLog.push(`Cuotas encontradas: ${installments.length}`);

        // 2. Obtener pagos válidos (APPROVED/COMPLETED) con FINANCING_INSTALLMENTS_PAYMENT
        const validPayments = await dataSource.query(`
          SELECT p.id, p.amount, p.metadata, p.status
          FROM payments p
          INNER JOIN payment_configs pc ON p.payment_config_id = pc.id
          WHERE p."relatedEntityType" = 'financingInstallments'
            AND p."relatedEntityId" = $1
            AND p.status IN ('APPROVED', 'COMPLETED')
            AND pc.code = 'FINANCING_INSTALLMENTS_PAYMENT'
          ORDER BY p.id ASC
        `, [disc.financingId]);

        console.log(`   💰 Pagos válidos: ${validPayments.length}`);
        resolutionLog.push(`Pagos válidos: ${validPayments.length}`);

        // Calcular total de pagos
        const totalPayments = validPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);
        console.log(`   💵 Total pagos: S/ ${totalPayments.toFixed(2)}`);

        // 3. Resetear TODAS las cuotas a estado inicial
        console.log(`   🔄 Reseteando todas las cuotas a estado inicial...`);
        resolutionLog.push(`Reseteando todas las cuotas...`);

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

        // 4. Re-aplicar los pagos válidos usando la metadata
        console.log(`   📝 Re-aplicando pagos válidos usando metadata...`);
        resolutionLog.push(`Re-aplicando pagos...`);

        let appliedFromMetadata = 0;

        for (const payment of validPayments) {
          const paymentAmount = parseFloat(payment.amount || '0');

          if (payment.metadata && payment.metadata['Cuotas afectadas']) {
            const cuotasAfectadas = payment.metadata['Cuotas afectadas'];

            if (typeof cuotasAfectadas === 'object') {
              for (const [key, data] of Object.entries(cuotasAfectadas)) {
                const match = key.match(/Cuota (\d+)/);
                if (match) {
                  const cuotaNum = parseInt(match[1]);
                  const cuotaData = data as any;
                  const appliedToCuota = parseFloat(
                    cuotaData['Aplicado a cuota'] || cuotaData['Monto aplicado'] || '0'
                  );

                  if (appliedToCuota > 0) {
                    // Buscar la cuota
                    const installment = installments.find((i: any) => i.numberCuote === cuotaNum);
                    if (installment) {
                      // Obtener valores actuales
                      const currentValues = await dataSource.query(`
                        SELECT "coutePaid", "coutePending", "couteAmount" FROM financing_installments WHERE id = $1
                      `, [installment.id]);

                      const currentPaid = parseFloat(currentValues[0]?.coutePaid || '0');
                      const couteAmount = parseFloat(currentValues[0]?.couteAmount || '0');

                      const newCoutePaid = Number((currentPaid + appliedToCuota).toFixed(2));
                      const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

                      let newStatus = 'PENDING';
                      if (newCoutePending <= 0) {
                        newStatus = 'PAID';
                      }

                      await dataSource.query(`
                        UPDATE financing_installments
                        SET "coutePaid" = $1, "coutePending" = $2, status = $3
                        WHERE id = $4
                      `, [newCoutePaid, newCoutePending, newStatus, installment.id]);

                      appliedFromMetadata += appliedToCuota;

                      console.log(`      Pago ${payment.id} -> Cuota ${cuotaNum}: +${appliedToCuota}`);
                      resolutionLog.push(`   Pago ${payment.id} -> Cuota ${cuotaNum}: +${appliedToCuota}`);
                    }
                  }
                }
              }
            }
          } else {
            // Pago sin metadata de cuotas afectadas - aplicar secuencialmente
            console.log(`      ⚠️ Pago ${payment.id} (S/ ${paymentAmount}) sin metadata - aplicando secuencialmente`);
            resolutionLog.push(`   Pago ${payment.id}: sin metadata, aplicando secuencialmente`);

            let remainingAmount = paymentAmount;

            // Obtener cuotas pendientes ordenadas
            const pendingInstallments = await dataSource.query(`
              SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending"
              FROM financing_installments
              WHERE "financingId" = $1 AND "coutePending" > 0
              ORDER BY "numberCuote" ASC
            `, [disc.financingId]);

            for (const inst of pendingInstallments) {
              if (remainingAmount <= 0) break;

              const pending = parseFloat(inst.coutePending || '0');
              const couteAmount = parseFloat(inst.couteAmount || '0');
              const currentPaid = parseFloat(inst.coutePaid || '0');

              const toApply = Math.min(remainingAmount, pending);

              const newCoutePaid = Number((currentPaid + toApply).toFixed(2));
              const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

              let newStatus = 'PENDING';
              if (newCoutePending <= 0) {
                newStatus = 'PAID';
              }

              await dataSource.query(`
                UPDATE financing_installments
                SET "coutePaid" = $1, "coutePending" = $2, status = $3
                WHERE id = $4
              `, [newCoutePaid, newCoutePending, newStatus, inst.id]);

              console.log(`         Cuota ${inst.numberCuote}: +${toApply.toFixed(2)}`);
              resolutionLog.push(`      Cuota ${inst.numberCuote}: +${toApply.toFixed(2)}`);

              remainingAmount = Number((remainingAmount - toApply).toFixed(2));
              appliedFromMetadata += toApply;
            }
          }
        }

        // 5. Validar si aún hay discrepancia
        const newInstallmentsResult = await dataSource.query(`
          SELECT COALESCE(SUM("coutePaid"), 0) as total_paid
          FROM financing_installments
          WHERE "financingId" = $1
        `, [disc.financingId]);

        const newTotalPaid = parseFloat(newInstallmentsResult[0]?.total_paid || '0');
        const remainingDiff = Number((totalPayments - newTotalPaid).toFixed(2));

        console.log(`   📊 Validación post-aplicación:`);
        console.log(`      Total pagos: S/ ${totalPayments.toFixed(2)}`);
        console.log(`      Total cuotas pagadas: S/ ${newTotalPaid.toFixed(2)}`);
        console.log(`      Diferencia restante: S/ ${remainingDiff.toFixed(2)}`);

        resolutionLog.push(`Validación post-aplicación:`);
        resolutionLog.push(`   Total pagos: S/ ${totalPayments.toFixed(2)}`);
        resolutionLog.push(`   Total cuotas pagadas: S/ ${newTotalPaid.toFixed(2)}`);
        resolutionLog.push(`   Diferencia restante: S/ ${remainingDiff.toFixed(2)}`);

        // 6. Si hay diferencia, ajustar la última cuota pagada
        if (Math.abs(remainingDiff) > 0.01) {
          console.log(`   🔧 Ajustando diferencia restante...`);

          // Obtener la última cuota pagada
          const paidInstallments = await dataSource.query(`
            SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending", status
            FROM financing_installments
            WHERE "financingId" = $1 AND "coutePaid" > 0
            ORDER BY "numberCuote" DESC
            LIMIT 1
          `, [disc.financingId]);

          if (paidInstallments.length > 0) {
            const lastPaid = paidInstallments[0];
            const currentCoutePaid = parseFloat(lastPaid.coutePaid || '0');
            const couteAmount = parseFloat(lastPaid.couteAmount || '0');

            let newCoutePaid = Number((currentCoutePaid + remainingDiff).toFixed(2));

            // Si el ajuste hace que coutePaid sea mayor que couteAmount, buscar la siguiente cuota
            if (newCoutePaid > couteAmount) {
              const excess = Number((newCoutePaid - couteAmount).toFixed(2));
              newCoutePaid = couteAmount;

              // Aplicar el exceso a la siguiente cuota pendiente
              const nextPendingInstallments = await dataSource.query(`
                SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending"
                FROM financing_installments
                WHERE "financingId" = $1 AND "numberCuote" > $2 AND "coutePending" > 0
                ORDER BY "numberCuote" ASC
                LIMIT 1
              `, [disc.financingId, lastPaid.numberCuote]);

              if (nextPendingInstallments.length > 0) {
                const nextInst = nextPendingInstallments[0];
                const nextCurrentPaid = parseFloat(nextInst.coutePaid || '0');
                const nextCouteAmount = parseFloat(nextInst.couteAmount || '0');
                const nextNewPaid = Number((nextCurrentPaid + excess).toFixed(2));
                const nextNewPending = Number((nextCouteAmount - nextNewPaid).toFixed(2));

                let nextStatus = 'PENDING';
                if (nextNewPending <= 0) {
                  nextStatus = 'PAID';
                }

                await dataSource.query(`
                  UPDATE financing_installments
                  SET "coutePaid" = $1, "coutePending" = $2, status = $3
                  WHERE id = $4
                `, [nextNewPaid, nextNewPending, nextStatus, nextInst.id]);

                console.log(`      Cuota ${nextInst.numberCuote}: ajustada +${excess} (exceso)`);
                resolutionLog.push(`   Cuota ${nextInst.numberCuote}: ajustada +${excess} (exceso)`);
              }
            }

            const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

            let newStatus = lastPaid.status;
            if (newCoutePaid >= couteAmount) {
              newStatus = 'PAID';
            } else if (newCoutePaid > 0 && newCoutePending > 0) {
              newStatus = 'PENDING';
            }

            await dataSource.query(`
              UPDATE financing_installments
              SET "coutePaid" = $1, "coutePending" = $2, status = $3
              WHERE id = $4
            `, [newCoutePaid, newCoutePending, newStatus, lastPaid.id]);

            console.log(`      Cuota ${lastPaid.numberCuote}: coutePaid ${currentCoutePaid} -> ${newCoutePaid}`);
            resolutionLog.push(`   Cuota ${lastPaid.numberCuote}: ajustada ${currentCoutePaid} -> ${newCoutePaid}`);
          } else {
            // No hay cuotas pagadas, aplicar a la primera cuota
            const firstInstallment = installments[0];
            if (firstInstallment) {
              const couteAmount = parseFloat(firstInstallment.couteAmount || '0');
              const newCoutePaid = Math.min(remainingDiff, couteAmount);
              const newCoutePending = Number((couteAmount - newCoutePaid).toFixed(2));

              let newStatus = 'PENDING';
              if (newCoutePending <= 0) {
                newStatus = 'PAID';
              }

              await dataSource.query(`
                UPDATE financing_installments
                SET "coutePaid" = $1, "coutePending" = $2, status = $3
                WHERE id = $4
              `, [newCoutePaid, newCoutePending, newStatus, firstInstallment.id]);

              console.log(`      Cuota 1: aplicado ${newCoutePaid} (sin cuotas previas pagadas)`);
              resolutionLog.push(`   Cuota 1: aplicado ${newCoutePaid}`);
            }
          }
        }

        // 7. Validación final
        const finalResult = await dataSource.query(`
          SELECT COALESCE(SUM("coutePaid"), 0) as total_paid
          FROM financing_installments
          WHERE "financingId" = $1
        `, [disc.financingId]);

        const finalTotalPaid = parseFloat(finalResult[0]?.total_paid || '0');
        const finalDiff = Number((totalPayments - finalTotalPaid).toFixed(2));

        console.log(`   ✅ Validación final:`);
        console.log(`      Total pagos: S/ ${totalPayments.toFixed(2)}`);
        console.log(`      Total cuotas: S/ ${finalTotalPaid.toFixed(2)}`);
        console.log(`      Diferencia: S/ ${finalDiff.toFixed(2)}`);

        if (Math.abs(finalDiff) <= 0.01) {
          console.log(`   ✅ ¡Discrepancia resuelta!`);
          resolutionLog.push(`✅ RESUELTO - Diferencia final: S/ ${finalDiff.toFixed(2)}`);
        } else {
          console.log(`   ⚠️ Aún hay diferencia de S/ ${finalDiff.toFixed(2)}`);
          resolutionLog.push(`⚠️ Diferencia pendiente: S/ ${finalDiff.toFixed(2)}`);
        }

        resolvedCount++;

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error procesando financing ${disc.financingId}:`, error);
        resolutionLog.push(`ERROR: ${error}`);
      }
    }

    // Guardar log de resolución
    const logPath = path.join(process.cwd(), 'reporte_resolucion_positivos.txt');
    let logContent = '='.repeat(80) + '\n';
    logContent += 'REPORTE DE RESOLUCIÓN DE DISCREPANCIAS POSITIVAS\n';
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
