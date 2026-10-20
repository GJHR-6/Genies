import type {
  AreaDia,
  AsignacionDia,
  PasteleraDia,
  ProductoDia,
} from "@/lib/asignaciones";
import { nombreHoja } from "@/lib/asignaciones";
import { compararProductos } from "@/lib/orden-productos";
import { titularDeArea, type TipoAsignacion } from "@/lib/reparto";

/** Un bloque del reparto (como un cuadro): productos × pasteleras. */
export type SeccionReparto = {
  clave: string;
  titulo: string;
  tipo: TipoAsignacion;
  /** null = columna "Sin asignar". */
  columnas: (PasteleraDia | null)[];
  productos: ProductoDia[];
  /** Área en equipo: nombre del equipo ("Kenia y Dany"); no se divide. */
  equipo?: string;
};

/** Clave de celda: producto | pastelera | tipo | tanda. */
export function claveCelda(
  productoId: number,
  pasteleraId: number | null,
  tipo: TipoAsignacion,
  tanda: number
): string {
  return `${productoId}|${pasteleraId ?? "x"}|${tipo}|${tanda}`;
}

// Mismo orden que el Excel en todas las secciones.
const porOrden = compararProductos;

/**
 * Arma las secciones del reparto en el orden de los cuadros: una por área
 * de producción, luego Decoración, luego "Sin área asignada". Solo entran
 * productos con asignaciones ese día.
 */
export function construirSecciones(params: {
  areas: AreaDia[];
  pasteleras: PasteleraDia[];
  productos: ProductoDia[];
  asignaciones: AsignacionDia[];
}): SeccionReparto[] {
  const { areas, pasteleras, productos, asignaciones } = params;
  const productoPorId = new Map(productos.map((p) => [p.id, p]));
  const pasteleraPorId = new Map(pasteleras.map((p) => [p.id, p]));
  const areaPorId = new Map(areas.map((a) => [a.id, a]));

  const conFilas = (tipo: TipoAsignacion) => {
    const ids = new Set<number>();
    for (const a of asignaciones) if (a.tipo === tipo) ids.add(a.producto_id);
    return ids;
  };
  const prodIds = conFilas("produccion");
  const decoIds = conFilas("decoracion");

  const columnasDe = (
    tipo: TipoAsignacion,
    ids: Set<number>,
    base: PasteleraDia[]
  ): (PasteleraDia | null)[] => {
    const lista = [...base];
    let conNull = false;
    for (const a of asignaciones) {
      if (a.tipo !== tipo || !ids.has(a.producto_id)) continue;
      if (a.pastelera_id === null) {
        conNull = true;
        continue;
      }
      if (!lista.some((p) => p.id === a.pastelera_id)) {
        const p = pasteleraPorId.get(a.pastelera_id);
        if (p) lista.push(p);
      }
    }
    lista.sort((a, b) => a.orden - b.orden || a.id - b.id);
    return conNull ? [...lista, null] : lista;
  };

  const secciones: SeccionReparto[] = [];

  for (const area of areas) {
    if (area.es_decoracion) continue;
    const prods = [...prodIds]
      .map((id) => productoPorId.get(id))
      .filter((p): p is ProductoDia => !!p && p.area_id === area.id)
      .sort(porOrden);
    if (prods.length === 0) continue;
    const ids = new Set(prods.map((p) => p.id));
    // En equipo, una sola columna: la titular (a nombre de todo el equipo).
    const titular = area.trabajo_en_equipo
      ? titularDeArea(pasteleras, area.id)
      : null;
    secciones.push({
      clave: `area-${area.id}`,
      titulo: area.nombre,
      tipo: "produccion",
      columnas: columnasDe(
        "produccion",
        ids,
        titular
          ? [titular]
          : pasteleras.filter((p) => p.activa && p.area_id === area.id)
      ),
      productos: prods,
      ...(titular
        ? { equipo: nombreHoja(titular, pasteleras, new Set([area.id])) }
        : {}),
    });
  }

  const decoracion = [...decoIds]
    .map((id) => productoPorId.get(id))
    .filter((p): p is ProductoDia => !!p)
    .sort(porOrden);
  if (decoracion.length > 0) {
    const areaDeco = areas.find((a) => a.es_decoracion);
    secciones.push({
      clave: "decoracion",
      titulo: "Decoración",
      tipo: "decoracion",
      columnas: columnasDe(
        "decoracion",
        new Set(decoracion.map((p) => p.id)),
        areaDeco
          ? pasteleras.filter((p) => p.activa && p.area_id === areaDeco.id)
          : []
      ),
      productos: decoracion,
    });
  }

  const sinArea = [...prodIds]
    .map((id) => productoPorId.get(id))
    .filter(
      (p): p is ProductoDia =>
        !!p && (p.area_id === null || !areaPorId.has(p.area_id))
    )
    .sort(porOrden);
  if (sinArea.length > 0) {
    secciones.push({
      clave: "sin-area",
      titulo: "Sin área asignada",
      tipo: "produccion",
      columnas: columnasDe("produccion", new Set(sinArea.map((p) => p.id)), []),
      productos: sinArea,
    });
  }

  return secciones;
}

/**
 * De quién son las tareas que ve una pastelera en la tablet: las suyas y,
 * si su área trabaja en equipo, las de la titular del área.
 */
export function idsDelEquipo(
  pastelera: PasteleraDia,
  pasteleras: PasteleraDia[],
  areasEnEquipo: ReadonlySet<number>
): number[] {
  if (!areasEnEquipo.has(pastelera.area_id)) return [pastelera.id];
  const titular = titularDeArea(pasteleras, pastelera.area_id);
  return titular && titular.id !== pastelera.id
    ? [pastelera.id, titular.id]
    : [pastelera.id];
}

/** Tareas de una pastelera (o equipo) agrupadas por tanda (tablet e impresión). */
export function tareasPorTanda(
  asignaciones: AsignacionDia[],
  pasteleraId: number | null | readonly number[],
  /** Posición del producto (orden del Excel); sin esto, por id. */
  posicion?: (productoId: number) => number
): { tanda: number; tareas: AsignacionDia[] }[] {
  const ids: readonly (number | null)[] = Array.isArray(pasteleraId)
    ? pasteleraId
    : [pasteleraId as number | null];
  const propias = asignaciones.filter(
    (a) => ids.includes(a.pastelera_id) && a.cantidad > 0
  );
  const tandas = [...new Set(propias.map((a) => a.tanda))].sort((a, b) => a - b);
  return tandas.map((tanda) => ({
    tanda,
    tareas: propias
      .filter((a) => a.tanda === tanda)
      .sort(
        (a, b) =>
          (a.tipo === b.tipo ? 0 : a.tipo === "produccion" ? -1 : 1) ||
          (posicion?.(a.producto_id) ?? a.producto_id) -
            (posicion?.(b.producto_id) ?? b.producto_id)
      ),
  }));
}
