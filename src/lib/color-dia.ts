/**
 * Color del día: cada pastel se marca con el color del día en que se
 * produjo, para controlar frescura y rotación. Domingo no hay producción.
 */

import { diaSemana } from "./sugeridos";

export type ColorDia = {
  nombre: string;
  /** Fondo del distintivo (hex). */
  fondo: string;
  /** Color del texto sobre el fondo (hex). */
  texto: string;
};

/** Índice = día de la semana (0=domingo … 6=sábado); domingo sin color. */
const COLORES: readonly (ColorDia | null)[] = [
  null,
  { nombre: "Rosado", fondo: "#E75A93", texto: "#FFFFFF" },
  { nombre: "Azul", fondo: "#2563EB", texto: "#FFFFFF" },
  { nombre: "Naranja", fondo: "#EA580C", texto: "#FFFFFF" },
  { nombre: "Verde", fondo: "#16A34A", texto: "#FFFFFF" },
  { nombre: "Amarillo", fondo: "#FACC15", texto: "#713F12" },
  { nombre: "Negro", fondo: "#171717", texto: "#FFFFFF" },
];

/** Color de producción de una fecha ISO; null si es domingo. */
export function colorDelDia(fechaIso: string): ColorDia | null {
  return COLORES[diaSemana(fechaIso)] ?? null;
}
