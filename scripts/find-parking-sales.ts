import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
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

const BASE_URL = 'http://smart.inmobiliariahuertas.com/ventas/detalle';

async function main() {
  // 1. Leer el archivo cochera.xlsx
  const filePath = path.resolve(__dirname, '..', 'cochera.xlsx');

  if (!fs.existsSync(filePath)) {
    console.error(`No se encontró el archivo: ${filePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Detectar si la primera fila es header
  const firstRow = rows[0];
  const firstValue = String(firstRow?.[0] ?? '').trim();
  const hasHeader = firstValue && isNaN(Number(firstValue));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (hasHeader) {
    console.log(`Header detectado: "${firstRow.join(' | ')}"\n`);
  }

  // 2. Filtrar filas donde la tercera columna inicie con "COCHERA"
  const parkingClients: { document: string; description: string }[] = [];

  for (const row of dataRows) {
    const document = String(row[0] ?? '').trim();
    const thirdCol = String(row[2] ?? '')
      .trim()
      .toUpperCase();

    if (!document) continue;

    if (thirdCol.startsWith('COCHERA')) {
      parkingClients.push({
        document,
        description: String(row[2] ?? '').trim(),
      });
    }
  }

  console.log(
    `Clientes con cochera encontrados en Excel: ${parkingClients.length}\n`,
  );

  if (parkingClients.length === 0) {
    console.log('No se encontraron clientes con cochera en el archivo.');
    return;
  }

  // 3. Conectar a la base de datos
  await dataSource.initialize();
  console.log('Conexión a base de datos establecida.\n');

  // 4. Buscar ventas de cada cliente por número de documento
  const results: { document: string; description: string; saleId: string }[] =
    [];
  const notFound: { document: string; description: string }[] = [];

  for (const client of parkingClients) {
    const sales: { id: string }[] = await dataSource.query(
      `
      SELECT s.id
      FROM sales s
      INNER JOIN clients c ON s."clientId" = c.id
      INNER JOIN leads l ON c.lead_id = l.id
      WHERE l.document = $1
      `,
      [client.document],
    );

    if (sales.length > 0) {
      for (const sale of sales) {
        results.push({
          document: client.document,
          description: client.description,
          saleId: sale.id,
        });
      }
    } else {
      notFound.push(client);
    }
  }

  // 5. Exportar resultados a TXT (sin duplicados)
  const outputPath = path.resolve(__dirname, '..', 'cochera-ventas.txt');
  const uniqueSaleIds = [...new Set(results.map((r) => r.saleId))];
  const lines = uniqueSaleIds.map((id) => `${BASE_URL}/${id}`);
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

  // 6. Resumen
  console.log('========== RESULTADOS ==========');
  console.log(`Clientes con cochera en Excel:  ${parkingClients.length}`);
  console.log(`Ventas encontradas:             ${results.length}`);
  console.log(`Ventas únicas (sin duplicados): ${uniqueSaleIds.length}`);
  console.log(`Clientes sin venta en BD:       ${notFound.length}`);
  console.log('================================\n');

  if (notFound.length > 0) {
    console.log('Clientes con cochera SIN venta encontrada:');
    notFound.forEach((c, i) => {
      console.log(`  ${i + 1}. Doc: ${c.document} - ${c.description}`);
    });
    console.log('');
  }

  console.log(`Archivo exportado: ${outputPath}`);
  console.log(`Total URLs generadas: ${uniqueSaleIds.length}`);
}

main()
  .catch((err) => {
    console.error('Error ejecutando el script:', err);
    process.exit(1);
  })
  .finally(() => {
    dataSource.destroy();
  });
