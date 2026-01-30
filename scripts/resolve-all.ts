import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function runCommand(command: string, description: string): boolean {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 ${description}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (error) {
    console.error(`❌ Error ejecutando: ${command}`);
    return false;
  }
}

function getDiscrepancyCount(): number {
  const reportPath = path.join(process.cwd(), 'reporte_discrepancias.txt');

  if (!fs.existsSync(reportPath)) {
    return -1;
  }

  const content = fs.readFileSync(reportPath, 'utf-8');
  const match = content.match(/Total de ventas con discrepancias: (\d+)/);

  if (match) {
    return parseInt(match[1]);
  }

  // Contar manualmente los "Sale ID:"
  const saleIds = content.match(/Sale ID:/g);
  return saleIds ? saleIds.length : 0;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                    RESOLUCIÓN COMPLETA DE DISCREPANCIAS                        ║
║                         Pagos vs Cuotas Pagadas                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  const startTime = Date.now();
  const results: { step: string; before: number; after: number }[] = [];

  // 1. Validación inicial
  console.log('\n📊 PASO 1: Validación inicial');
  runCommand('pnpm run validate:amount', 'Ejecutando validación inicial...');
  const initialCount = getDiscrepancyCount();
  console.log(`\n📈 Discrepancias iniciales: ${initialCount}`);

  if (initialCount === 0) {
    console.log('\n✅ No hay discrepancias para resolver. ¡Todo está correcto!');
    return;
  }

  let currentCount = initialCount;

  // 2. resolve:amount - Resolver usando metadata de pagos cancelados
  console.log('\n📊 PASO 2: Resolver con metadata de cancelados');
  runCommand('pnpm run resolve:amount', 'Resolviendo con metadata de pagos cancelados...');
  runCommand('pnpm run validate:amount', 'Validando después de resolve:amount...');
  let newCount = getDiscrepancyCount();
  results.push({ step: 'resolve:amount', before: currentCount, after: newCount });
  console.log(`\n📈 Discrepancias: ${currentCount} → ${newCount} (resueltas: ${currentCount - newCount})`);
  currentCount = newCount;

  if (currentCount === 0) {
    printSummary(initialCount, currentCount, results, startTime);
    return;
  }

  // 3. resolve:min-amount - Resolver diferencias menores a S/ 30
  console.log('\n📊 PASO 3: Resolver diferencias menores (< S/ 30)');
  runCommand('pnpm run resolve:min-amount', 'Resolviendo diferencias menores...');
  runCommand('pnpm run validate:amount', 'Validando después de resolve:min-amount...');
  newCount = getDiscrepancyCount();
  results.push({ step: 'resolve:min-amount', before: currentCount, after: newCount });
  console.log(`\n📈 Discrepancias: ${currentCount} → ${newCount} (resueltas: ${currentCount - newCount})`);
  currentCount = newCount;

  if (currentCount === 0) {
    printSummary(initialCount, currentCount, results, startTime);
    return;
  }

  // 4. resolve:positive-amount - Resolver casos positivos con metadata
  console.log('\n📊 PASO 4: Resolver casos positivos (pagos > cuotas)');
  runCommand('pnpm run resolve:positive-amount', 'Resolviendo casos positivos...');
  runCommand('pnpm run validate:amount', 'Validando después de resolve:positive-amount...');
  newCount = getDiscrepancyCount();
  results.push({ step: 'resolve:positive-amount', before: currentCount, after: newCount });
  console.log(`\n📈 Discrepancias: ${currentCount} → ${newCount} (resueltas: ${currentCount - newCount})`);
  currentCount = newCount;

  if (currentCount === 0) {
    printSummary(initialCount, currentCount, results, startTime);
    return;
  }

  // 5. resolve:other-cases - Resolver casos sin metadata (secuencial)
  console.log('\n📊 PASO 5: Resolver otros casos (sin metadata)');
  runCommand('pnpm run resolve:other-cases', 'Resolviendo otros casos...');
  runCommand('pnpm run validate:amount', 'Validación final...');
  newCount = getDiscrepancyCount();
  results.push({ step: 'resolve:other-cases', before: currentCount, after: newCount });
  console.log(`\n📈 Discrepancias: ${currentCount} → ${newCount} (resueltas: ${currentCount - newCount})`);
  currentCount = newCount;

  printSummary(initialCount, currentCount, results, startTime);
}

function printSummary(initial: number, final: number, results: { step: string; before: number; after: number }[], startTime: number) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const resolved = initial - final;
  const percentage = initial > 0 ? ((resolved / initial) * 100).toFixed(1) : '100';

  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                              RESUMEN FINAL                                     ║
╚════════════════════════════════════════════════════════════════════════════════╝

📊 RESULTADOS POR PASO:
${'─'.repeat(80)}
`);

  console.log(`${'Paso'.padEnd(30)} ${'Antes'.padStart(10)} ${'Después'.padStart(10)} ${'Resueltas'.padStart(12)}`);
  console.log(`${'─'.repeat(80)}`);

  for (const r of results) {
    const resolved = r.before - r.after;
    console.log(`${r.step.padEnd(30)} ${r.before.toString().padStart(10)} ${r.after.toString().padStart(10)} ${resolved.toString().padStart(12)}`);
  }

  console.log(`${'─'.repeat(80)}`);
  console.log(`${'TOTAL'.padEnd(30)} ${initial.toString().padStart(10)} ${final.toString().padStart(10)} ${resolved.toString().padStart(12)}`);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║  📈 Discrepancias iniciales:  ${initial.toString().padStart(5)}                                        ║
║  📉 Discrepancias finales:    ${final.toString().padStart(5)}                                        ║
║  ✅ Total resueltas:          ${resolved.toString().padStart(5)} (${percentage}%)                                   ║
║  ⏱️  Tiempo de ejecución:     ${duration.padStart(5)}s                                       ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

  if (final > 0) {
    console.log(`⚠️  Quedan ${final} discrepancias que requieren análisis manual.`);
    console.log(`   Ver: reporte_discrepancias.txt\n`);
  } else {
    console.log(`🎉 ¡Todas las discrepancias han sido resueltas!\n`);
  }
}

main().catch(console.error);
