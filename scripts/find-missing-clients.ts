import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as path from 'path';

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
  // Leer Excel
  const filePath = path.resolve(__dirname, '..', 'data.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Extraer documentos de la primera columna (omitir header si existe)
  const allValues = rows.map((row) => String(row[0] ?? '').trim()).filter(Boolean);

  // Detectar si la primera fila es header (no numérico)
  const firstValue = allValues[0];
  const hasHeader = firstValue && isNaN(Number(firstValue));
  const excelDocuments = hasHeader ? allValues.slice(1) : allValues;

  console.log(`Documentos en Excel: ${excelDocuments.length}`);
  if (hasHeader) console.log(`(Header detectado: "${firstValue}", omitido)\n`);
  else console.log('');

  // Conectar a BD
  await dataSource.initialize();
  console.log('Conexión a base de datos establecida.\n');

  // Obtener documentos de clientes en BD
  const dbRows: { document: string }[] = await dataSource.query(`
    SELECT le.document
    FROM clients c
    INNER JOIN leads le ON c.lead_id = le.id
  `);

  const dbDocuments = new Set(dbRows.map((r) => String(r.document).trim()));
  console.log(`Clientes en BD: ${dbDocuments.size}\n`);

  // Encontrar faltantes
  const missing = excelDocuments.filter((doc) => !dbDocuments.has(doc));

  if (missing.length === 0) {
    console.log('Todos los documentos del Excel existen en la base de datos.');
  } else {
    console.log(`Documentos faltantes (${missing.length}):\n`);
    missing.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc}`);
    });
  }

  console.log('\n========== RESUMEN ==========');
  console.log(`Total en Excel:    ${excelDocuments.length}`);
  console.log(`Total en BD:       ${dbDocuments.size}`);
  console.log(`Encontrados:       ${excelDocuments.length - missing.length}`);
  console.log(`Faltantes:         ${missing.length}`);
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
