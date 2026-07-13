/**
 * Rotación de producto: estima la edad del inventario actual por día de
 * producción (color). Bajo venta "primero lo más viejo" (FIFO), el saldo de
 * hoy se compone de los ingresos más recientes; si el saldo supera lo que
 * ingresó en los últimos días, el excedente es pastel rezagado: hay que
 * darle prioridad de venta o regresarlo a Principal para cambio.
 */

import { diaAnterior } from "./fechas";

export type IngresoDia = { fecha: string; ingreso: number };

export type LoteEstimado = {
  /** Día en que se produjo (ISO); null si es anterior a la ventana. */
  fechaProduccion: string | null;
  unidades: number;
  /** Días en tienda respecto a la fecha de referencia. */
  dias: number;
};

export type AccionRotacion = "fresco" | "prioridad" | "regresar";

/** Con 2 días en tienda: prioridad de venta. */
export const DIAS_PRIORIDAD = 2;
/** Con 3 días o más: regresar a Principal para cambio. */
export const DIAS_REGRESAR = 3;
/** Días hacia atrás que se revisan para fechar el saldo. */
export const VENTANA_DIAS = 7;

export function accionPorDias(dias: number): AccionRotacion {
  if (dias >= DIAS_REGRESAR) return "regresar";
  if (dias >= DIAS_PRIORIDAD) return "prioridad";
  return "fresco";
}

/**
 * Reparte el saldo actual entre los días de ingreso, del más reciente al
 * más viejo. `ingresos` acepta cualquier orden; días sin ingreso no fechan
 * unidades. Lo que no alcanza a fecharse dentro de la ventana se reporta
 * con `fechaProduccion: null` y `dias: VENTANA_DIAS`.
 */
export function estimarLotes(
  saldo: number,
  hoy: string,
  ingresos: IngresoDia[]
): LoteEstimado[] {
  const porFecha = new Map<string, number>();
  for (const i of ingresos) {
    porFecha.set(i.fecha, (porFecha.get(i.fecha) ?? 0) + i.ingreso);
  }

  const lotes: LoteEstimado[] = [];
  let restante = saldo;
  let fecha = hoy;
  for (let dias = 0; dias < VENTANA_DIAS && restante > 0; dias++) {
    const unidades = Math.min(restante, porFecha.get(fecha) ?? 0);
    if (unidades > 0) {
      lotes.push({ fechaProduccion: fecha, unidades, dias });
      restante -= unidades;
    }
    fecha = diaAnterior(fecha);
  }
  if (restante > 0) {
    lotes.push({
      fechaProduccion: null,
      unidades: restante,
      dias: VENTANA_DIAS,
    });
  }
  return lotes;
}

/** Lotes con edad de alerta (prioridad o regresar), del más viejo al más nuevo. */
export function lotesRezagados(lotes: LoteEstimado[]): LoteEstimado[] {
  return lotes
    .filter((l) => accionPorDias(l.dias) !== "fresco")
    .sort((a, b) => b.dias - a.dias);
}
