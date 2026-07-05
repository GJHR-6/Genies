import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { SugeridosCliente, type CeldaSugerido } from "./sugeridos-cliente";

export const dynamic = "force-dynamic";

/** dia de la semana (0=domingo … 6=sábado) de una fecha ISO. */
function diaSemana(fechaIso: string): number {
  return new Date(`${fechaIso}T12:00:00Z`).getUTCDay();
}

export default async function SugeridosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  const dow = diaSemana(fecha);

  const [productosRes, sucursalesRes, reglasRes, sugeridosRes] =
    await Promise.all([
      supabase
        .from("productos")
        .select("id, nombre, tamano, categoria")
        .eq("activo", true)
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("id"),
      supabase
        .from("reglas_sugerido")
        .select("producto_id, sucursal_id, dia_semana, objetivo"),
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
  if (error) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Sugeridos</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  // Objetivo por producto × sucursal: la regla del día pesa más que la general.
  const objetivos = new Map<string, number>();
  for (const r of reglasRes.data ?? []) {
    const clave = `${r.producto_id}-${r.sucursal_id}`;
    if (r.dia_semana === dow) {
      objetivos.set(clave, r.objetivo);
    } else if (r.dia_semana === null && !objetivos.has(clave)) {
      objetivos.set(clave, r.objetivo);
    }
  }
  // Segunda pasada: una regla específica siempre gana aunque viniera después.
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

  const celdas: Record<string, CeldaSugerido> = {};
  for (const p of productosRes.data ?? []) {
    for (const s of sucursalesRes.data ?? []) {
      const clave = `${p.id}-${s.id}`;
      const objetivo = objetivos.get(clave);
      if (objetivo === undefined) continue; // sin regla: no hay sugerido
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

  return (
    <SugeridosCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      productos={productosRes.data ?? []}
      sucursales={sucursalesRes.data ?? []}
      celdasIniciales={celdas}
    />
  );
}
