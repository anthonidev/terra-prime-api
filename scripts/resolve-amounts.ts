import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface Discrepancy {
  saleId: string;
  financingId: string;
}

interface AffectedInstallment {
  cuotaNumber: number;
  appliedToCuota: number;
  appliedToMora: number;
}

async function main() {
  console.log('🔧 Iniciando resolución de discrepancias...\n');

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

  for (const line of lines) {
    if (line.startsWith('Sale ID: ')) {
      currentSaleId = line.replace('Sale ID: ', '').trim();
    } else if (line.startsWith('Financing ID: ')) {
      currentFinancingId = line.replace('Financing ID: ', '').trim();
      if (currentSaleId && currentFinancingId) {
        discrepancies.push({
          saleId: currentSaleId,
          financingId: currentFinancingId,
        });
      }
    }
  }

  console.log(
    `📊 Discrepancias encontradas en el reporte: ${discrepancies.length}\n`,
  );

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
      console.log(`\n🔍 Procesando Financing: ${disc.financingId}`);
      resolutionLog.push(`\n${'='.repeat(80)}`);
      resolutionLog.push(`Financing ID: ${disc.financingId}`);
      resolutionLog.push(`Sale ID: ${disc.saleId}`);

      try {
        // 1. Obtener todas las cuotas del financing
        const installments = await dataSource.query(
          `
          SELECT id, "numberCuote", "couteAmount", "coutePaid", "coutePending",
                 "lateFeeAmount", "lateFeeAmountPaid", "lateFeeAmountPending", status
          FROM financing_installments
          WHERE "financingId" = $1
          ORDER BY "numberCuote" ASC
        `,
          [disc.financingId],
        );

        console.log(`   📋 Cuotas encontradas: ${installments.length}`);
        resolutionLog.push(`Cuotas encontradas: ${installments.length}`);

        // 2. Obtener pagos APPROVED/COMPLETED con metadata de cuotas afectadas
        const validPayments = await dataSource.query(
          `
          SELECT p.id, p.amount, p.metadata, p.status
          FROM payments p
          INNER JOIN payment_configs pc ON p.payment_config_id = pc.id
          WHERE p."relatedEntityType" = 'financingInstallments'
            AND p."relatedEntityId" = $1
            AND p.status IN ('APPROVED', 'COMPLETED')
            AND pc.code = 'FINANCING_INSTALLMENTS_PAYMENT'
        `,
          [disc.financingId],
        );

        console.log(
          `   💰 Pagos válidos (APPROVED/COMPLETED): ${validPayments.length}`,
        );
        resolutionLog.push(`Pagos válidos: ${validPayments.length}`);

        // 3. Obtener pagos CANCELLED con metadata de cuotas afectadas
        const cancelledPayments = await dataSource.query(
          `
          SELECT p.id, p.amount, p.metadata, p.status
          FROM payments p
          INNER JOIN payment_configs pc ON p.payment_config_id = pc.id
          WHERE p."relatedEntityType" = 'financingInstallments'
            AND p."relatedEntityId" = $1
            AND p.status = 'CANCELLED'
            AND pc.code = 'FINANCING_INSTALLMENTS_PAYMENT'
        `,
          [disc.financingId],
        );

        console.log(`   ❌ Pagos cancelados: ${cancelledPayments.length}`);
        resolutionLog.push(`Pagos cancelados: ${cancelledPayments.length}`);

        // 4. Identificar cuotas afectadas por pagos válidos
        const cuotasInValidPayments = new Set<number>();

        for (const payment of validPayments) {
          if (payment.metadata && payment.metadata['Cuotas afectadas']) {
            const cuotasAfectadas = payment.metadata['Cuotas afectadas'];

            // Puede ser un objeto o un string con IDs separados por coma
            if (typeof cuotasAfectadas === 'object') {
              for (const key of Object.keys(cuotasAfectadas)) {
                const match = key.match(/Cuota (\d+)/);
                if (match) {
                  cuotasInValidPayments.add(parseInt(match[1]));
                }
              }
            }
          }
        }

        console.log(
          `   ✅ Cuotas en pagos válidos: ${Array.from(cuotasInValidPayments).join(', ') || 'ninguna'}`,
        );
        resolutionLog.push(
          `Cuotas en pagos válidos: ${Array.from(cuotasInValidPayments).join(', ') || 'ninguna'}`,
        );

        // 5. Identificar cuotas afectadas por pagos cancelados que NO están en pagos válidos
        const cuotasToReset = new Set<number>();

        for (const payment of cancelledPayments) {
          if (payment.metadata && payment.metadata['Cuotas afectadas']) {
            const cuotasAfectadas = payment.metadata['Cuotas afectadas'];

            if (typeof cuotasAfectadas === 'object') {
              for (const key of Object.keys(cuotasAfectadas)) {
                const match = key.match(/Cuota (\d+)/);
                if (match) {
                  const cuotaNum = parseInt(match[1]);
                  if (!cuotasInValidPayments.has(cuotaNum)) {
                    cuotasToReset.add(cuotaNum);
                  }
                }
              }
            }
          }
        }

        console.log(
          `   🔄 Cuotas a resetear (en cancelados, no en válidos): ${Array.from(cuotasToReset).join(', ') || 'ninguna'}`,
        );
        resolutionLog.push(
          `Cuotas a resetear: ${Array.from(cuotasToReset).join(', ') || 'ninguna'}`,
        );

        // 6. Resetear TODAS las cuotas a su estado inicial (coutePaid=0, moras=0)
        console.log(`   🔄 Reseteando todas las cuotas a estado inicial...`);
        resolutionLog.push(`Reseteando todas las cuotas a estado inicial...`);

        for (const installment of installments) {
          const cuotaNum = installment.numberCuote;
          const currentCoutePaid = parseFloat(installment.coutePaid || '0');
          const couteAmount = parseFloat(installment.couteAmount || '0');
          const lateFeeAmount = parseFloat(installment.lateFeeAmount || '0');

          // Resetear a estado inicial
          const newCoutePaid = 0;
          const newCoutePending = couteAmount;
          const newLateFeeAmountPaid = 0;
          const newLateFeeAmountPending = lateFeeAmount;

          // Determinar estado inicial
          let newStatus = 'PENDING';
          const installmentDate = await dataSource.query(
            `
            SELECT "expectedPaymentDate" FROM financing_installments WHERE id = $1
          `,
            [installment.id],
          );
          const expectedDate = new Date(
            installmentDate[0]?.expectedPaymentDate,
          );
          const now = new Date();
          if (expectedDate < now && lateFeeAmount > 0) {
            newStatus = 'EXPIRED';
          }

          // Actualizar la cuota
          await dataSource.query(
            `
            UPDATE financing_installments
            SET "coutePaid" = $1,
                "coutePending" = $2,
                "lateFeeAmountPaid" = $3,
                "lateFeeAmountPending" = $4,
                status = $5
            WHERE id = $6
          `,
            [
              newCoutePaid,
              newCoutePending,
              newLateFeeAmountPaid,
              newLateFeeAmountPending,
              newStatus,
              installment.id,
            ],
          );

          if (currentCoutePaid > 0) {
            console.log(
              `      Cuota ${cuotaNum}: reseteada (coutePaid ${currentCoutePaid} -> 0)`,
            );
            resolutionLog.push(
              `   Cuota ${cuotaNum}: reseteada - coutePaid: ${currentCoutePaid} -> 0`,
            );
          }
        }

        // 7. Ahora re-aplicar los pagos válidos a las cuotas
        console.log(`   📝 Re-aplicando pagos válidos...`);
        resolutionLog.push(`Re-aplicando pagos válidos...`);

        // Ordenar cuotas por número
        installments.sort((a: any, b: any) => a.numberCuote - b.numberCuote);

        for (const payment of validPayments) {
          if (payment.metadata && payment.metadata['Cuotas afectadas']) {
            const cuotasAfectadas = payment.metadata['Cuotas afectadas'];

            if (typeof cuotasAfectadas === 'object') {
              for (const [key, data] of Object.entries(cuotasAfectadas)) {
                const match = key.match(/Cuota (\d+)/);
                if (match) {
                  const cuotaNum = parseInt(match[1]);
                  const cuotaData = data as any;
                  const appliedToCuota = parseFloat(
                    cuotaData['Aplicado a cuota'] ||
                      cuotaData['Monto aplicado'] ||
                      '0',
                  );

                  // Buscar la cuota
                  const installment = installments.find(
                    (i: any) => i.numberCuote === cuotaNum,
                  );
                  if (installment) {
                    // Obtener valores actuales de la BD (pueden haber cambiado)
                    const currentValues = await dataSource.query(
                      `
                      SELECT "coutePaid", "coutePending", "couteAmount" FROM financing_installments WHERE id = $1
                    `,
                      [installment.id],
                    );

                    const currentPaid = parseFloat(
                      currentValues[0]?.coutePaid || '0',
                    );
                    const couteAmount = parseFloat(
                      currentValues[0]?.couteAmount || '0',
                    );

                    const newCoutePaid = Number(
                      (currentPaid + appliedToCuota).toFixed(2),
                    );
                    const newCoutePending = Number(
                      (couteAmount - newCoutePaid).toFixed(2),
                    );

                    // Determinar estado
                    let newStatus = 'PENDING';
                    if (newCoutePending <= 0) {
                      newStatus = 'PAID';
                    }

                    await dataSource.query(
                      `
                      UPDATE financing_installments
                      SET "coutePaid" = $1, "coutePending" = $2, status = $3
                      WHERE id = $4
                    `,
                      [
                        newCoutePaid,
                        newCoutePending,
                        newStatus,
                        installment.id,
                      ],
                    );

                    console.log(
                      `      Pago ${payment.id} -> Cuota ${cuotaNum}: +${appliedToCuota} (total pagado: ${newCoutePaid})`,
                    );
                    resolutionLog.push(
                      `   Pago ${payment.id} -> Cuota ${cuotaNum}: aplicado ${appliedToCuota}, total pagado: ${newCoutePaid}`,
                    );
                  }
                }
              }
            }
          }
        }

        resolvedCount++;
        console.log(
          `   ✅ Financing ${disc.financingId} procesado correctamente`,
        );
      } catch (error) {
        errorCount++;
        console.error(
          `   ❌ Error procesando financing ${disc.financingId}:`,
          error,
        );
        resolutionLog.push(`ERROR: ${error}`);
      }
    }

    // Guardar log de resolución
    const logPath = path.join(process.cwd(), 'reporte_resolucion.txt');
    let logContent = '='.repeat(80) + '\n';
    logContent += 'REPORTE DE RESOLUCIÓN DE DISCREPANCIAS\n';
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
    console.log(
      `\n💡 Ejecuta 'pnpm run validate:amount' para verificar las correcciones`,
    );
  } catch (error) {
    console.error('❌ Error durante la resolución:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexión cerrada.');
  }
}

main();
