/** Fechas del negocio: el "día" se define en America/Tegucigalpa. */

const ZONA = "America/Tegucigalpa";

/** Fecha de hoy del negocio en formato ISO (YYYY-MM-DD). */
export function hoyTegucigalpa(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Día pedido en la URL (?fecha=AAAA-MM-DD) para ver o imprimir un día
 * anterior. Si falta, no es una fecha o es futura, vale hoy.
 */
export function fechaElegida(param: string | undefined, hoy: string): string {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return hoy;
  const d = new Date(`${param}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== param) return hoy;
  return param > hoy ? hoy : param;
}

/** Día anterior a una fecha ISO (YYYY-MM-DD), sin efectos de zona horaria. */
export function diaAnterior(fechaIso: string): string {
  const fecha = new Date(`${fechaIso}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

/** Fecha ISO en formato legible: "viernes, 4 de julio de 2026". */
export function formatoLargo(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${fechaIso}T00:00:00Z`));
}
