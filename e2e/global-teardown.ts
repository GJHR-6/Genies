import { hoy, leerEstado, limpiar } from "./datos";

/**
 * Limpieza al terminar (aunque fallen tests). Si las guardas del inicio
 * no pasaron, no hay archivo de estado y NO se borra nada del día.
 */
export default async function globalTeardown() {
  const estado = leerEstado();
  if (!estado || estado.fecha !== hoy()) {
    console.log("E2E: sin estado de esta corrida; no se limpia el día.");
    return;
  }
  const hecho = await limpiar();
  console.log(`E2E limpieza: ${hecho.join(" · ")}`);
}
