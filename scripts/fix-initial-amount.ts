import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  await dataSource.initialize();
  console.log('Conexión a base de datos establecida.\n');

  const rows: {
    sale_id: string;
    financing_id: string;
    reservationAmount: number;
    initialAmount: number;
  }[] = await dataSource.query(`
    SELECT
      s.id AS sale_id,
      f.id AS financing_id,
      s."reservationAmount",
      f."initialAmount"
    FROM sales s
    LEFT JOIN financing f ON s.financing_id = f.id
    WHERE s."fromReservation" = true
      AND f.id IS NOT NULL
      AND f."initialAmount" != 0
  `);

  console.log(`Registros encontrados: ${rows.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const reservationAmount = parseFloat(String(row.reservationAmount));
    const initialAmount = parseFloat(String(row.initialAmount));

    if (!reservationAmount || reservationAmount === 0) {
      console.log(
        `  [SKIP] Sale ${row.sale_id}: reservationAmount es 0 o null`,
      );
      skipped++;
      continue;
    }

    const newInitialAmount = reservationAmount + initialAmount;

    console.log(
      `  [UPDATE] Financing ${row.financing_id}: initialAmount ${initialAmount} -> ${newInitialAmount} (reservationAmount: ${reservationAmount} + initialAmount: ${initialAmount})`,
    );

    await dataSource.query(
      `UPDATE financing SET "initialAmount" = $1 WHERE id = $2`,
      [newInitialAmount, row.financing_id],
    );

    updated++;
  }

  console.log('\n========== RESUMEN PASO 1: initialAmount ==========');
  console.log(`Total procesados:  ${rows.length}`);
  console.log(`Actualizados:      ${updated}`);
  console.log(`Omitidos:          ${skipped}`);
  console.log('====================================================\n');

  // ========== PASO 2: Recalcular initialAmountPending ==========
  console.log('--- PASO 2: Recalcular initialAmountPending ---\n');

  const rows2: {
    sale_id: string;
    financing_id: string;
    reservationAmount: number;
    initialAmount: number;
    initialAmountPaid: number;
    initialAmountPending: number;
  }[] = await dataSource.query(`
    SELECT
      s.id AS sale_id,
      f.id AS financing_id,
      s."reservationAmount",
      f."initialAmount",
      f."initialAmountPaid",
      f."initialAmountPending"
    FROM sales s
    LEFT JOIN financing f ON s.financing_id = f.id
    WHERE s."fromReservation" = true
      AND f.id IS NOT NULL
      AND f."initialAmount" != 0
  `);

  console.log(`Registros encontrados: ${rows2.length}\n`);

  let updated2 = 0;
  let skipped2 = 0;

  for (const row of rows2) {
    const reservationAmount = parseFloat(String(row.reservationAmount));
    const initialAmount = parseFloat(String(row.initialAmount));
    const initialAmountPaid = parseFloat(String(row.initialAmountPaid));
    const oldPending = parseFloat(String(row.initialAmountPending));

    if (!reservationAmount || reservationAmount === 0) {
      console.log(
        `  [SKIP] Sale ${row.sale_id}: reservationAmount es 0 o null`,
      );
      skipped2++;
      continue;
    }

    const totalPaid = reservationAmount + initialAmountPaid;
    const newPending = Math.max(initialAmount - totalPaid, 0);

    console.log(
      `  [UPDATE] Financing ${row.financing_id}: initialAmountPending ${oldPending} -> ${newPending} (initialAmount: ${initialAmount} - (reservationAmount: ${reservationAmount} + initialAmountPaid: ${initialAmountPaid}))`,
    );

    await dataSource.query(
      `UPDATE financing SET "initialAmountPending" = $1 WHERE id = $2`,
      [newPending, row.financing_id],
    );

    updated2++;
  }

  console.log('\n========== RESUMEN PASO 2: initialAmountPending ==========');
  console.log(`Total procesados:  ${rows2.length}`);
  console.log(`Actualizados:      ${updated2}`);
  console.log(`Omitidos:          ${skipped2}`);
  console.log('==========================================================\n');
}

main()
  .catch((err) => {
    console.error('Error ejecutando el script:', err);
    process.exit(1);
  })
  .finally(() => {
    dataSource.destroy();
  });
