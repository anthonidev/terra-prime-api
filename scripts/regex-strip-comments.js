const fs = require("fs").promises;
const glob = require("glob");

// Extensiones de archivos a procesar
const extensions = [".js", ".jsx", ".ts", ".tsx"];

// Expresiones regulares para identificar diferentes tipos de comentarios
const REGEX_PATTERNS = [
  // Comentarios de bloque /* ... */
  /\/\*[\s\S]*?\*\//g,
  // Comentarios de una línea //
  /\/\/.*$/gm,
  // Comentarios JSX {/* ... */}
  /\{\/\*[\s\S]*?\*\/\}/g,
];

async function processFile(filePath) {
  try {
    // Leer el archivo
    let content = await fs.readFile(filePath, "utf8");

    // Aplicar cada patrón regex para eliminar comentarios
    for (const pattern of REGEX_PATTERNS) {
      content = content.replace(pattern, "");
    }

    // Eliminar líneas vacías resultantes
    content = content.replace(/^\s*[\r\n]/gm, "");

    // Escribir el archivo actualizado
    await fs.writeFile(filePath, content, "utf8");

    console.log(`Processed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Función principal
async function main() {
  try {
    // Encontrar todos los archivos con las extensiones especificadas
    const files = extensions.flatMap((ext) =>
      glob.sync(`src/**/*${ext}`, {
        ignore: ["**/node_modules/**", "dist/**"],
      })
    );

    console.log(`Found ${files.length} files to process`);

    // Procesar todos los archivos en paralelo
    await Promise.all(files.map(processFile));

    console.log("Finished removing comments from all files!");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
