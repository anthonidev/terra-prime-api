import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function removeUnusedCode() {
  try {
    console.log(
      "🔍 Buscando y eliminando importaciones y variables no utilizadas...",
    );

    // Usar bun en lugar de npx
    const command = 'bun eslint --fix "src/**/*.{js,jsx,ts,tsx}"';

    console.log(`\nEjecutando: ${command}\n`);
    const output = execSync(command, { encoding: "utf8" });

    console.log("✅ Proceso completado.");
    console.log("\nResumen:");
    console.log(output);
  } catch (error) {
    console.error("❌ Error al ejecutar ESLint:", error.message);

    // Mostrar la salida del comando aunque haya fallado
    if (error.stdout) {
      console.log("\nSalida de ESLint:");
      console.log(error.stdout);
    }
  }
}

removeUnusedCode();
