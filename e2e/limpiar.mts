/**
 * Limpieza manual de una corrida E2E que se cortó (npm run e2e:limpiar).
 * ⚠️ Borra el inventario y el cierre de HOY de la sucursal de prueba.
 */
import { SUCURSAL_PRUEBA, limpiar } from "./datos";

if (process.env.E2E_PERMITIR_PRODUCCION !== "1") {
  console.error("Definí E2E_PERMITIR_PRODUCCION=1 (npm run e2e:limpiar lo hace).");
  process.exit(1);
}
console.log(`Limpiando restos E2E (inventario de hoy de ${SUCURSAL_PRUEBA} incluido)…`);
const hecho = await limpiar();
console.log(hecho.map((h) => `  ✓ ${h}`).join("\n"));
