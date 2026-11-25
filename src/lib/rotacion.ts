/**
 * Rotación de producto: estima la edad del inventario actual por día de
 * producción (color). Bajo venta "primero lo más viejo" (FIFO), el saldo de
 * hoy se compone de los ingresos más recientes; si el saldo supera lo que
 * ingresó en los últimos días, el excedente es pastel rezagado: hay que
 * darle prioridad de venta o regresarlo a Principal para cambio.
 */

import { diaAnterior } from "./fechas";
import { diaSemana } from "./sugeridos";

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

/**
 * Días de producción anteriores a `fecha` (sin domingos), del más reciente
 * al más viejo: los que la tienda puede elegir cuando parte del ingreso de
 * hoy es de otro día.
 */
export function diasProduccionAnteriores(fecha: string, cuantos = 3): string[] {
  const dias: string[] = [];
  let f = fecha;
  while (dias.length < cuantos) {
    f = diaAnterior(f);
    if (diaSemana(f) !== 0) dias.push(f);
  }
  return dias;
}

/** Ingreso de días anteriores: fecha de producción → unidades. */
export type IngresoAnterior = Record<string, number>;

/**
 * Reparte el ingreso de un día por fecha de producción: lo que la tienda
 * dijo que es de días anteriores va a esos días (sin pasarse del ingreso,
 * empezando por lo más viejo) y el resto queda en `fecha`.
 */
export function ingresoPorProduccion(
  fecha: string,
  ingreso: number,
  anterior: IngresoAnterior | null | undefined
): IngresoDia[] {
  const resultado: IngresoDia[] = [];
  let restante = Math.max(ingreso, 0);
  const previos = Object.entries(anterior ?? {})
    .filter(([f, n]) => f < fecha && Number.isFinite(n) && n > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  for (const [f, n] of previos) {
    const unidades = Math.min(Math.floor(n), restante);
    if (unidades <= 0) break;
    resultado.push({ fecha: f, ingreso: unidades });
    restante -= unidades;
  }
  if (restante > 0) resultado.push({ fecha, ingreso: restante });
  return resultado;
}

/** Lotes con edad de alerta (prioridad o regresar), del más viejo al más nuevo. */
export function lotesRezagados(lotes: LoteEstimado[]): LoteEstimado[] {
  return lotes
    .filter((l) => accionPorDias(l.dias) !== "fresco")
    .sort((a, b) => b.dias - a.dias);
}
