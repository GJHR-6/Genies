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
  /** Posición en el Excel (manda el orden en todas las pantallas). */
  orden: number | null;
  lleva_decoracion: boolean;
};

export type SucursalDia = { id: number; nombre: string };

export type SugeridosDelDia = {
  productos: ProductoSugerido[];
  sucursales: SucursalDia[];
  /** Clave `${productoId}-${sucursalId}`; sin entrada = sin regla de sugerido. */
  celdas: Record<string, CeldaSugerido>;
  /**
   * Pasteles sin decorar que Principal anotó hoy en su inventario
   * (producto → unidades). Ya están hechos: solo falta decorarlos.
   */
  sinDecorar: Record<number, number>;
  /** Decorados que Principal anotó hoy (producto → unidades). */
  decorado: Record<number, number>;
  /** Cambios de hoy por tienda: clave `${productoId}-${sucursalId}`. */
  cambios: Record<string, number>;
  /** Pedido que anotó cada tienda hoy (misma clave; solo > 0). */
  pedidos: Record<string, number>;
  /** Ajuste del admin a lo que se manda (misma clave); manda sobre el pedido. */
  mandarOverride: Record<string, number>;
  /** Saldo de Principal hoy (producto → unidades), si ya lo anotó. */
  saldoPrincipal: Record<number, number>;
  /** Id de la sucursal Principal (no sale como columna de tienda). */
  principalId: number | null;
};

export type TotalProducto = {
  /** Suma de sugeridos de todas las sucursales (lo que hay que mandar). */
  total: number;
  /** Sin decorar en Principal (solo productos que llevan decoración). */
  sinDecorar: number;
  /** Lo que falta hornear: total − sin decorar (nunca negativo). */
  aProducir: number;
  /** Lo que hay que decorar: el total, si el producto lleva decoración. */
  aDecorar: number;
};

/**
 * Totales del día por producto. Lo que ya está sin decorar en Principal se
 * descuenta de la producción (se hornea solo la diferencia), lleve o no
 * decoración; la decoración es el total de los que llevan decoración.
 */
export function totalesPorProducto(
  dia: Pick<SugeridosDelDia, "productos" | "sucursales" | "celdas" | "sinDecorar">
): Map<number, TotalProducto> {
  const resultado = new Map<number, TotalProducto>();
  for (const p of dia.productos) {
    let total = 0;
    for (const s of dia.sucursales) {
      total += dia.celdas[`${p.id}-${s.id}`]?.sugerido ?? 0;
    }
    const sinDecorar = Math.max(dia.sinDecorar[p.id] ?? 0, 0);
    resultado.set(p.id, {
      total,
      sinDecorar,
      aProducir: Math.max(total - sinDecorar, 0),
      aDecorar: p.lleva_decoracion ? total : 0,
    });
  }
  return resultado;
}

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

  const [productosRes, sucursalesRes, reglasRes, sugeridosRes, principalRes, cambiosRes] =
    await Promise.all([
      supabase
        .from("productos")
        .select(
          "id, nombre, tamano, categoria, departamento_id, area_id, orden_area, orden, lleva_decoracion"
        )
        .eq("activo", true)
        .order("orden", { nullsFirst: false })
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("sucursales")
        .select("id, nombre, es_principal")
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
      supabase
        .from("movimientos_diarios")
        .select(
          "producto_id, saldo_inicial, ingreso, devolucion, saldo_final, decorado, sin_decorar, sucursales!inner(es_principal)"
        )
        .eq("fecha", fecha)
        .eq("sucursales.es_principal", true),
      supabase
        .from("movimientos_diarios")
        .select("producto_id, sucursal_id, cambio, pedido, mandar_override")
        .eq("fecha", fecha)
        .or("cambio.gt.0,pedido.gt.0,mandar_override.not.is.null"),
    ]);

  const error =
    productosRes.error ??
    sucursalesRes.error ??
    reglasRes.error ??
    sugeridosRes.error ??
    principalRes.error ??
    cambiosRes.error;
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
  const sucursales = (sucursalesRes.data ?? []).map(({ id, nombre }) => ({
    id,
    nombre,
  }));
  const principalId =
    (sucursalesRes.data ?? []).find((s) => s.es_principal)?.id ?? null;
  const sinDecorar: Record<number, number> = {};
  const decorado: Record<number, number> = {};
  const saldoPrincipal: Record<number, number> = {};
  for (const m of principalRes.data ?? []) {
    if (m.sin_decorar > 0) sinDecorar[m.producto_id] = m.sin_decorar;
    if (m.decorado > 0) decorado[m.producto_id] = m.decorado;
    saldoPrincipal[m.producto_id] =
      m.saldo_final ?? m.saldo_inicial + m.ingreso - m.devolucion;
  }
  const cambios: Record<string, number> = {};
  const pedidos: Record<string, number> = {};
  const mandarOverride: Record<string, number> = {};
  for (const m of cambiosRes.data ?? []) {
    const clave = `${m.producto_id}-${m.sucursal_id}`;
    if (m.cambio > 0) cambios[clave] = m.cambio;
    if (m.pedido > 0) pedidos[clave] = m.pedido;
    if (m.mandar_override !== null) mandarOverride[clave] = m.mandar_override;
  }
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

  return {
    productos,
    sucursales,
    celdas,
    sinDecorar,
    decorado,
    cambios,
    pedidos,
    mandarOverride,
    saldoPrincipal,
    principalId,
  };
}
