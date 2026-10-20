import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { EstadoAsignacion, TipoAsignacion } from "@/lib/reparto";

export type AsignacionDia = {
  id: number;
  producto_id: number;
  pastelera_id: number | null;
  tipo: TipoAsignacion;
  tanda: number;
  cantidad: number;
  cantidad_hecha: number;
  estado: EstadoAsignacion;
  updated_at: string;
};

export type PasteleraDia = {
  id: number;
  nombre: string;
  area_id: number;
  porcentaje: number;
  orden: number;
  activa: boolean;
  requiere_pin: boolean;
};

export type AreaDia = {
  id: number;
  nombre: string;
  orden: number;
  es_decoracion: boolean;
  activa: boolean;
  /** true = el área no se divide: una hoja compartida (p. ej. Kenia y Dany). */
  trabajo_en_equipo: boolean;
};

export type ProductoDia = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
  area_id: number | null;
  orden_area: number | null;
  orden: number | null;
  lleva_decoracion: boolean;
};

/**
 * Lo que el cuadro dice para cada producto (para comparar con el reparto):
 * hornear (total − sin decorar), decorar (total) y sin decorar en Principal.
 */
export type TotalesCuadro = Record<
  number,
  { produccion: number; decoracion: number; sinDecorar: number }
>;

export type PlanDia = {
  estado: "borrador" | "publicado";
  generado_at: string | null;
  publicado_at: string | null;
} | null;

export const TANDAS = [1, 2, 3, 4] as const;

export const COLUMNAS_ASIGNACION =
  "id, producto_id, pastelera_id, tipo, tanda, cantidad, cantidad_hecha, estado, updated_at";

export const COLUMNAS_PASTELERA =
  "id, nombre, area_id, porcentaje, orden, activa, requiere_pin";

/** Normaliza una fila de la tabla (los check constraints garantizan los literales). */
export function aAsignacion(
  fila: Database["public"]["Tables"]["asignaciones"]["Row"] | {
    id: number;
    producto_id: number;
    pastelera_id: number | null;
    tipo: string;
    tanda: number;
    cantidad: number;
    cantidad_hecha: number;
    estado: string;
    updated_at: string;
  }
): AsignacionDia {
  return {
    id: fila.id,
    producto_id: fila.producto_id,
    pastelera_id: fila.pastelera_id,
    tipo: fila.tipo === "decoracion" ? "decoracion" : "produccion",
    tanda: fila.tanda,
    cantidad: fila.cantidad,
    cantidad_hecha: fila.cantidad_hecha,
    estado:
      fila.estado === "listo"
        ? "listo"
        : fila.estado === "en_proceso"
          ? "en_proceso"
          : "pendiente",
    updated_at: fila.updated_at,
  };
}

export function aPastelera(fila: {
  id: number;
  nombre: string;
  area_id: number;
  porcentaje: number | string;
  orden: number;
  activa: boolean;
  requiere_pin: boolean;
}): PasteleraDia {
  return { ...fila, porcentaje: Number(fila.porcentaje) };
}

export type DatosReparto = {
  plan: PlanDia;
  areas: AreaDia[];
  pasteleras: PasteleraDia[];
  productos: ProductoDia[];
  asignaciones: AsignacionDia[];
};

/** Todo lo necesario para ver/editar el reparto de un día. */
export async function cargarReparto(
  supabase: SupabaseClient<Database>,
  fecha: string
): Promise<DatosReparto> {
  const [planRes, areasRes, pastelerasRes, productosRes, asignacionesRes] =
    await Promise.all([
      supabase
        .from("planes_dia")
        .select("estado, generado_at, publicado_at")
        .eq("fecha", fecha)
        .maybeSingle(),
      supabase
        .from("areas_produccion")
        .select("id, nombre, orden, es_decoracion, activa, trabajo_en_equipo")
        .order("orden"),
      supabase
        .from("pasteleras")
        .select(COLUMNAS_PASTELERA)
        .order("orden")
        .order("id"),
      supabase
        .from("productos")
        .select(
          "id, nombre, tamano, categoria, area_id, orden_area, orden, lleva_decoracion"
        )
        .eq("activo", true)
        .order("orden", { nullsFirst: false })
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("asignaciones")
        .select(COLUMNAS_ASIGNACION)
        .eq("fecha", fecha)
        .order("tanda")
        .order("id"),
    ]);

  const error =
    planRes.error ??
    areasRes.error ??
    pastelerasRes.error ??
    productosRes.error ??
    asignacionesRes.error;
  if (error) throw new Error(error.message);

  const plan = planRes.data
    ? {
        estado:
          planRes.data.estado === "publicado"
            ? ("publicado" as const)
            : ("borrador" as const),
        generado_at: planRes.data.generado_at,
        publicado_at: planRes.data.publicado_at,
      }
    : null;

  return {
    plan,
    areas: areasRes.data ?? [],
    pasteleras: (pastelerasRes.data ?? []).map(aPastelera),
    productos: productosRes.data ?? [],
    asignaciones: (asignacionesRes.data ?? []).map(aAsignacion),
  };
}

/** Ids de las áreas activas que trabajan en equipo. */
export function idsAreasEnEquipo(
  areas: { id: number; activa: boolean; trabajo_en_equipo: boolean }[]
): Set<number> {
  return new Set(areas.filter((a) => a.activa && a.trabajo_en_equipo).map((a) => a.id));
}

/**
 * Nombre de una hoja: en un área en equipo, el de todo el equipo
 * ("Kenia y Dany"); si no, el de la pastelera.
 */
export function nombreHoja(
  pastelera: { nombre: string; area_id: number },
  pasteleras: { nombre: string; area_id: number; activa: boolean; orden: number; id: number }[],
  areasEnEquipo: ReadonlySet<number>
): string {
  if (!areasEnEquipo.has(pastelera.area_id)) return pastelera.nombre;
  const nombres = pasteleras
    .filter((p) => p.activa && p.area_id === pastelera.area_id)
    .sort((a, b) => a.orden - b.orden || a.id - b.id)
    .map((p) => p.nombre);
  if (nombres.length <= 1) return pastelera.nombre;
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** "VAINILLA · 6X2" */
export function nombreProducto(p: { nombre: string; tamano: string | null }) {
  return p.tamano ? `${p.nombre} · ${p.tamano}` : p.nombre;
}

/** Hora corta en Tegucigalpa ("14:05"). */
export function horaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Tegucigalpa",
  }).format(new Date(iso));
}
