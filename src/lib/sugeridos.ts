import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export type CeldaSugerido = {
  objetivo: number;
  saldo: number | null;
  sugerido: number;
  esOverride: boolean;
  conCaptura: boolean;
};

export type ProductoSugerido = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
  departamento_id: number | null;
  area_id: number | null;
  orden_area: number | null;
  lleva_decoracion: boolean;
};

export type SucursalDia = { id: number; nombre: string };

export type SugeridosDelDia = {
  productos: ProductoSugerido[];
  sucursales: SucursalDia[];
  /** Clave `${productoId}-${sucursalId}`; sin entrada = sin regla de sugerido. */
  celdas: Record<string, CeldaSugerido>;
};

export type ReglaSugerido = {
  producto_id: number;
  sucursal_id: number;
  dia_semana: number | null;
  objetivo: number;
};

const PAGINA_REGLAS = 1000;

/**
 * Todas las reglas de sugerido, por páginas: PostgREST corta cada respuesta
 * en 1000 filas y sin paginar los objetivos se perderían sin aviso.
 */
export async function cargarReglas(
  supabase: SupabaseClient<Database>
): Promise<ReglaSugerido[]> {
  const filas: ReglaSugerido[] = [];
  for (let desde = 0; ; desde += PAGINA_REGLAS) {
    const { data, error } = await supabase
      .from("reglas_sugerido")
      .select("producto_id, sucursal_id, dia_semana, objetivo")
      .order("id")
      .range(desde, desde + PAGINA_REGLAS - 1);
    if (error) throw new Error(error.message);
    filas.push(...data);
    if (data.length < PAGINA_REGLAS) return filas;
  }
}

/** Día de la semana (0=domingo … 6=sábado) de una fecha ISO. */
export function diaSemana(fechaIso: string): number {
  return new Date(`${fechaIso}T12:00:00Z`).getUTCDay();
}

/**
 * Sugeridos del día por producto × sucursal: objetivo según regla
 * (la específica del día de semana pesa más que la general), saldo y
 * override desde v_sugeridos. Sin captura, el sugerido es el objetivo.
 */
export async function cargarSugeridosDelDia(
  supabase: SupabaseClient<Database>,
  fecha: string
): Promise<SugeridosDelDia> {
  const dow = diaSemana(fecha);

  const [productosRes, sucursalesRes, reglasRes, sugeridosRes] =
    await Promise.all([
      supabase
        .from("productos")
        .select(
          "id, nombre, tamano, categoria, departamento_id, area_id, orden_area, lleva_decoracion"
        )
        .eq("activo", true)
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("id"),
      cargarReglas(supabase).then(
        (data) => ({ data, error: null }),
        (e: Error) => ({ data: null, error: e })
      ),
      supabase
        .from("v_sugeridos")
        .select("producto_id, sucursal_id, saldo, sugerido, es_override")
        .eq("fecha", fecha),
    ]);

  const error =
    productosRes.error ??
    sucursalesRes.error ??
    reglasRes.error ??
    sugeridosRes.error;
  if (error) throw new Error(error.message);

  const objetivos = new Map<string, number>();
  for (const r of reglasRes.data ?? []) {
    const clave = `${r.producto_id}-${r.sucursal_id}`;
    if (r.dia_semana === null && !objetivos.has(clave)) {
      objetivos.set(clave, r.objetivo);
    }
  }
  for (const r of reglasRes.data ?? []) {
    if (r.dia_semana === dow) {
      objetivos.set(`${r.producto_id}-${r.sucursal_id}`, r.objetivo);
    }
  }

  const capturas = new Map(
    (sugeridosRes.data ?? []).map((s) => [
      `${s.producto_id}-${s.sucursal_id}`,
      s,
    ])
  );

  const productos = productosRes.data ?? [];
  const sucursales = sucursalesRes.data ?? [];
  const celdas: Record<string, CeldaSugerido> = {};
  for (const p of productos) {
    for (const s of sucursales) {
      const clave = `${p.id}-${s.id}`;
      const objetivo = objetivos.get(clave);
      if (objetivo === undefined) continue;
      const captura = capturas.get(clave);
      celdas[clave] = {
        objetivo,
        saldo: captura?.saldo ?? null,
        sugerido: captura?.sugerido ?? Math.max(objetivo, 0),
        esOverride: captura?.es_override ?? false,
        conCaptura: captura !== undefined,
      };
    }
  }

  return { productos, sucursales, celdas };
}
