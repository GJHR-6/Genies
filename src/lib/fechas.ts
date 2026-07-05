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
