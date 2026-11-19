/**
 * Control de lo que no se mandó (reunión del 16 oct; en el sistema desde
 * el 3 nov 2026). Al despachar se anota, por tienda y producto, cuánto no
 * salió. Desde el 19 nov se suma solo a lo que se manda el siguiente día
 * con producción (el domingo pasa al lunes); si ese día tampoco sale, se
 * vuelve a anotar y pasa al siguiente. `enviado_at` = se mandó después el
 * mismo día (ya no se suma).
 */

export type NoEnviado = {
  id: number;
  fecha: string;
  sucursal_id: number;
  producto_id: number;
  cantidad: number;
  enviado_at: string | null;
};

/** Días hacia atrás que se siguen mostrando los pendientes. */
export const DIAS_PENDIENTES = 14;

/**
 * Lo escrito en la casilla "No se mandó" → cantidad a guardar.
 * Vacío o 0 = se mandó todo (null). Nunca más de lo que había que mandar.
 */
export function cantidadNoEnviada(texto: string, mandar: number): number | null {
  const n = parseInt(texto.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, Math.max(mandar, 0));
}

/** Lo que sigue pendiente, del más viejo al más nuevo. */
export function pendientes<T extends Pick<NoEnviado, "fecha" | "enviado_at">>(
  registros: readonly T[]
): T[] {
  return registros
    .filter((r) => r.enviado_at === null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Por tienda: total de unidades pendientes. */
export function pendientesPorTienda(
  registros: readonly Pick<NoEnviado, "sucursal_id" | "cantidad" | "enviado_at">[]
): Map<number, number> {
  const total = new Map<number, number>();
  for (const r of registros) {
    if (r.enviado_at !== null) continue;
    total.set(r.sucursal_id, (total.get(r.sucursal_id) ?? 0) + r.cantidad);
  }
  return total;
}

/** "hoy", "ayer" o "lun 2 nov" (para la lista de pendientes). */
export function cuandoFue(fecha: string, hoy: string): string {
  if (fecha === hoy) return "hoy";
  const ayer = new Date(`${hoy}T12:00:00Z`);
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  if (fecha === ayer.toISOString().slice(0, 10)) return "ayer";
  return new Intl.DateTimeFormat("es-HN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${fecha}T12:00:00Z`))
    .replace(/\./g, "");
}

/** El día con producción anterior a `fecha` (salta el domingo). */
export function diaProduccionAnterior(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Lo que no salió el día anterior y se suma a lo de hoy, por
 * `${productoId}-${sucursalId}` (solo lo que no se mandó después).
 */
export function arrastre(
  registros: readonly Pick<NoEnviado, "producto_id" | "sucursal_id" | "cantidad" | "enviado_at">[]
): Record<string, number> {
  const total: Record<string, number> = {};
  for (const r of registros) {
    if (r.enviado_at !== null || r.cantidad <= 0) continue;
    const clave = `${r.producto_id}-${r.sucursal_id}`;
    total[clave] = (total[clave] ?? 0) + r.cantidad;
  }
  return total;
}
