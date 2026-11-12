/**
 * Reparto de la producción del día entre pasteleras.
 *
 * Reglas (validadas con la encargada, oct 2026):
 *  - El total de cada producto es la suma de sugeridos de las sucursales
 *    (lo mismo que la columna "Total" del cuadro).
 *  - Cada producto lo hace su área de producción (como en los cuadros) y
 *    dentro del área se divide por un porcentaje FIJO por pastelera.
 *  - Siempre en unidades enteras: método del mayor residuo; la unidad que
 *    sobra rota según el día para que no le toque siempre a la misma.
 *  - Todo arranca en la tanda 1; el admin lo parte en tandas 1–4 al editar.
 *    Si el cuadro completo ya tiene PROD escrito por batida (p. ej. 15*12),
 *    la producción sale en esas tandas (10 nov 2026).
 *  - Decoración: la hacen las pasteleras del área de decoración; si no hay
 *    ninguna activa, las del área del producto.
 *  - Producción y decoración pueden tener totales distintos: lo que ya está
 *    sin decorar en Principal no se vuelve a hornear, pero sí se decora.
 *  - Productos del área de decoración: solo se decoran, nunca se producen.
 *  - Áreas «en equipo» (p. ej. Kenia y Dany): no se divide; todo queda en
 *    una sola hoja compartida, a nombre de la primera pastelera del área
 *    (la titular), y cualquiera del equipo la ve y la marca en la tablet.
 */

export type TipoAsignacion = "produccion" | "decoracion";

export type PasteleraReparto = {
  id: number;
  area_id: number;
  porcentaje: number;
  orden: number;
  activa: boolean;
};

export type ProductoReparto = {
  id: number;
  area_id: number | null;
  lleva_decoracion: boolean;
};

export type FilaReparto = {
  producto_id: number;
  pastelera_id: number | null;
  tipo: TipoAsignacion;
  tanda: number;
  cantidad: number;
};

/** Día del año (1–366) de una fecha ISO, para rotar el sobrante. */
export function diaDelAnio(fechaIso: string): number {
  const fecha = Date.UTC(
    Number(fechaIso.slice(0, 4)),
    Number(fechaIso.slice(5, 7)) - 1,
    Number(fechaIso.slice(8, 10))
  );
  const inicio = Date.UTC(Number(fechaIso.slice(0, 4)), 0, 1);
  return Math.round((fecha - inicio) / 86_400_000) + 1;
}

/**
 * Divide `total` unidades según los pesos (porcentajes) con el método del
 * mayor residuo. La suma del resultado es siempre exactamente `total`.
 * Empates de residuo: gana la que sigue en la rotación (`rotacion`).
 */
export function repartirEntero(
  total: number,
  pesos: { id: number; porcentaje: number }[],
  rotacion = 0
): Map<number, number> {
  const resultado = new Map<number, number>();
  const validos = pesos.filter((p) => p.porcentaje > 0);
  if (total <= 0 || validos.length === 0) {
    for (const p of pesos) resultado.set(p.id, 0);
    return resultado;
  }

  const suma = validos.reduce((s, p) => s + p.porcentaje, 0);
  const n = validos.length;
  const desplazamiento = ((rotacion % n) + n) % n;

  const partes = validos.map((p, i) => {
    const exacto = (total * p.porcentaje) / suma;
    const base = Math.floor(exacto + 1e-9);
    return {
      id: p.id,
      base,
      residuo: exacto - base,
      // posición en la rotación de hoy (0 = primera en recibir sobrante)
      turno: (i - desplazamiento + n) % n,
    };
  });

  let sobrante = total - partes.reduce((s, p) => s + p.base, 0);
  const orden = [...partes].sort(
    (a, b) => b.residuo - a.residuo || a.turno - b.turno
  );
  for (const p of orden) {
    if (sobrante <= 0) break;
    p.base += 1;
    sobrante -= 1;
  }

  for (const p of pesos) resultado.set(p.id, 0);
  for (const p of partes) resultado.set(p.id, p.base);
  return resultado;
}

const porOrdenPastelera = (a: PasteleraReparto, b: PasteleraReparto) =>
  a.orden - b.orden || a.id - b.id;

/**
 * Titular de un área en equipo: la primera pastelera activa en el orden
 * del área. Es a nombre de quien queda la hoja compartida.
 */
export function titularDeArea<T extends PasteleraReparto>(
  pasteleras: T[],
  areaId: number
): T | null {
  return (
    pasteleras
      .filter((p) => p.activa && p.area_id === areaId)
      .sort(porOrdenPastelera)[0] ?? null
  );
}

/**
 * Quién reparte un área: en equipo, solo la titular (sin dividir); si no,
 * las pasteleras activas con porcentaje, en su orden.
 */
function pastelerasDeArea(
  pasteleras: PasteleraReparto[],
  areaId: number | null,
  areasEnEquipo: ReadonlySet<number>
): PasteleraReparto[] {
  if (areaId === null) return [];
  if (areasEnEquipo.has(areaId)) {
    const titular = titularDeArea(pasteleras, areaId);
    return titular ? [{ ...titular, porcentaje: 100 }] : [];
  }
  return pasteleras
    .filter((p) => p.activa && p.area_id === areaId && p.porcentaje > 0)
    .sort(porOrdenPastelera);
}

/** Tandas del reparto (T1–T4); lo escrito en batidas 5–10 va a la última. */
export const TANDAS_REPARTO = 4;

function repartirProducto(
  productoId: number,
  total: number,
  tipo: TipoAsignacion,
  equipo: PasteleraReparto[],
  rotacion: number,
  tanda = 1
): FilaReparto[] {
  if (total <= 0) return [];
  if (equipo.length === 0) {
    return [
      { producto_id: productoId, pastelera_id: null, tipo, tanda, cantidad: total },
    ];
  }
  const partes = repartirEntero(total, equipo, rotacion);
  return equipo
    .map((p) => ({
      producto_id: productoId,
      pastelera_id: p.id,
      tipo,
      tanda,
      cantidad: partes.get(p.id) ?? 0,
    }))
    .filter((f) => f.cantidad > 0);
}

/** Batidas 1–10 del cuadro → tandas 1–4 (lo de la 5 en adelante, a la 4). */
export function batidasATandas(batidas: readonly number[]): number[] {
  const tandas = Array<number>(TANDAS_REPARTO).fill(0);
  batidas.forEach((c, i) => {
    tandas[Math.min(i, TANDAS_REPARTO - 1)] += Math.max(c, 0);
  });
  return tandas;
}

/** Reparto completo del día: producción y decoración. */
export function generarReparto(params: {
  fecha: string;
  productos: ProductoReparto[];
  /** Producción del día por producto (sugeridos − sin decorar). */
  totales: Map<number, number>;
  /** Decoración del día por producto; si falta, se usa `totales`. */
  totalesDecoracion?: Map<number, number>;
  pasteleras: PasteleraReparto[];
  /** Id del área de decoración, si existe. */
  areaDecoracionId: number | null;
  /** Áreas que trabajan en equipo (una hoja compartida, sin dividir). */
  areasEnEquipo?: ReadonlySet<number>;
  /**
   * PROD escrito por batida en el cuadro completo (producto → batidas
   * 1–10). Esos productos se reparten en esas tandas en vez de `totales`.
   */
  prodPorBatida?: ReadonlyMap<number, readonly number[]>;
}): FilaReparto[] {
  const { fecha, productos, totales, pasteleras, areaDecoracionId } = params;
  const totalesDecoracion = params.totalesDecoracion ?? totales;
  const areasEnEquipo = params.areasEnEquipo ?? new Set<number>();
  const dia = diaDelAnio(fecha);
  const decoradoras = pastelerasDeArea(pasteleras, areaDecoracionId, areasEnEquipo);
  const filas: FilaReparto[] = [];

  for (const producto of productos) {
    const total = totales.get(producto.id) ?? 0;
    const totalDecoracion = producto.lleva_decoracion
      ? (totalesDecoracion.get(producto.id) ?? 0)
      : 0;
    const conBatidas = (params.prodPorBatida?.get(producto.id) ?? []).some((c) => c > 0);
    if (total <= 0 && totalDecoracion <= 0 && !conBatidas) continue;
    const equipoArea = pastelerasDeArea(pasteleras, producto.area_id, areasEnEquipo);
    const rotacion = dia + producto.id;
    const soloDecoracion = areaDecoracionId !== null && producto.area_id === areaDecoracionId;

    const batidas = params.prodPorBatida?.get(producto.id);
    if (soloDecoracion) {
      // Solo se decora: nada de producción.
    } else if (batidas) {
      batidasATandas(batidas).forEach((cantidad, i) =>
        filas.push(
          ...repartirProducto(producto.id, cantidad, "produccion", equipoArea, rotacion + i, i + 1)
        )
      );
    } else {
      filas.push(
        ...repartirProducto(producto.id, total, "produccion", equipoArea, rotacion)
      );
    }
    if (totalDecoracion > 0) {
      filas.push(
        ...repartirProducto(
          producto.id,
          totalDecoracion,
          "decoracion",
          decoradoras.length > 0 ? decoradoras : equipoArea,
          rotacion
        )
      );
    }
  }
  return filas;
}

/**
 * Suma de porcentajes por área (debe dar 100 para un reparto completo).
 * Las áreas en equipo no se dividen: no entran en la cuenta.
 */
export function sumaPorcentajesPorArea(
  pasteleras: PasteleraReparto[],
  areasEnEquipo: ReadonlySet<number> = new Set()
): Map<number, number> {
  const sumas = new Map<number, number>();
  for (const p of pasteleras) {
    if (!p.activa || areasEnEquipo.has(p.area_id)) continue;
    sumas.set(p.area_id, (sumas.get(p.area_id) ?? 0) + p.porcentaje);
  }
  return sumas;
}

export type EstadoAsignacion = "pendiente" | "en_proceso" | "listo";

/** Avance de una lista de asignaciones: unidades hechas / totales. */
export function resumirAvance(
  asignaciones: { cantidad: number; cantidad_hecha: number; estado: string }[]
): { hechas: number; total: number; listas: number; tareas: number } {
  let hechas = 0;
  let total = 0;
  let listas = 0;
  for (const a of asignaciones) {
    total += a.cantidad;
    hechas += Math.min(a.cantidad_hecha, a.cantidad);
    if (a.estado === "listo") listas += 1;
  }
  return { hechas, total, listas, tareas: asignaciones.length };
}
