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

  const payments: {
    id: number;
    metadata: Record<string, any>;
  }[] = await dataSource.query(
    `SELECT id, metadata FROM payments WHERE "relatedEntityType" = 'financingInstallments' AND metadata IS NOT NULL`,
  );

  console.log(
    `Total de pagos financingInstallments con metadata: ${payments.length}\n`,
  );

  let updated = 0;
  let skipped = 0;
  let withoutKey = 0;

  for (const payment of payments) {
    const meta = payment.metadata;

    if (!meta || typeof meta !== 'object') {
      skipped++;
      continue;
    }

    const cuotasAfectadas = meta['Cuotas afectadas'];

    if (cuotasAfectadas === undefined) {
      console.log(
        `  [SKIP] Payment #${payment.id}: no tiene la llave "Cuotas afectadas". Keys: ${Object.keys(meta).join(', ')}`,
      );
      withoutKey++;
      continue;
    }

    const newMetadata = { 'Cuotas afectadas': cuotasAfectadas };

    const originalKeys = Object.keys(meta);
    const removedKeys = originalKeys.filter((k) => k !== 'Cuotas afectadas');

    if (removedKeys.length === 0) {
      skipped++;
      continue;
    }

    await dataSource.query(`UPDATE payments SET metadata = $1 WHERE id = $2`, [
      JSON.stringify(newMetadata),
      payment.id,
    ]);

    console.log(
      `  [OK] Payment #${payment.id}: eliminadas keys [${removedKeys.join(', ')}]`,
    );
    updated++;
  }

  console.log('\n========== RESUMEN ==========');
  console.log(`Total procesados:        ${payments.length}`);
  console.log(`Actualizados:            ${updated}`);
  console.log(`Sin cambios (ya limpio): ${skipped}`);
  console.log(`Sin "Cuotas afectadas":  ${withoutKey}`);
  console.log('=============================\n');
}

main()
  .catch((err) => {
    console.error('Error ejecutando el script:', err);
    process.exit(1);
  })
  .finally(() => {
    dataSource.destroy();
  });
