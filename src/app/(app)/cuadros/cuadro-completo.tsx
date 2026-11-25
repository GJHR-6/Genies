import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { formatoLargo } from "@/lib/fechas";
import { prodAutomatico } from "@/lib/batidas";
import { compararProductos } from "@/lib/orden-productos";
import type { SugeridosDelDia } from "@/lib/sugeridos";
import { ChipColorDia } from "@/components/color-dia";
import { HojaCuadro, type DatosBatidas } from "./hoja-cuadro";

/**
 * PROD automático (lo que hay que producir, en la batida 1), lo cambiado a
 * mano en DEC / PROD y libras de un día, para el cuadro completo. Lo usan
 * Cuadros, las hojas de despacho y el Historial de Principal.
 */
export async function cargarDatosBatidas(
  supabase: SupabaseClient<Database>,
  fecha: string,
  dia: SugeridosDelDia
): Promise<DatosBatidas> {
  const [librasRes, ajustesRes, decoracionRes] = await Promise.all([
    supabase.from("productos").select("id, libras").eq("activo", true),
    supabase.from("batidas_ajuste").select("producto_id, tipo, tanda, cantidad").eq("fecha", fecha),
    supabase.from("areas_produccion").select("id").eq("es_decoracion", true).maybeSingle(),
  ]);
  const error = librasRes.error ?? ajustesRes.error ?? decoracionRes.error;
  if (error) throw new Error(error.message);
  const tipo = (t: string) => (t === "decoracion" ? ("decoracion" as const) : ("produccion" as const));
  return {
    prodAutomatico: Object.fromEntries(prodAutomatico(dia, decoracionRes.data?.id ?? null)),
    ajustes: (ajustesRes.data ?? []).map((a) => ({ ...a, tipo: tipo(a.tipo) })),
    libras: Object.fromEntries(
      (librasRes.data ?? [])
        .filter((p) => p.libras !== null && Number(p.libras) > 0)
        .map((p) => [p.id, Number(p.libras)])
    ),
  };
}

/**
 * El cuadro completo de un día (como INVENTARIO DIARIO del Excel), editable:
 * DECO · SIN DECO · INV/TOTAL · tiendas + CM · SALDO · DEC/PROD por batida.
 */
export function CuadroCompleto({
  fecha,
  dia,
  batidas,
}: {
  fecha: string;
  dia: SugeridosDelDia;
  batidas: DatosBatidas;
}) {
  const ordenExcel = [...dia.productos].sort(compararProductos);
  if (ordenExcel.length === 0) return null;
  return (
    <article className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0">
      <header className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2 print:border-black">
        <h2 className="text-lg font-bold">Cuadro completo (como el Excel)</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground print:text-black">
            Gennie&apos;s · {formatoLargo(fecha)}
          </p>
          <ChipColorDia fecha={fecha} conEtiqueta />
        </div>
      </header>
      <HojaCuadro
        fecha={fecha}
        productos={ordenExcel}
        sucursales={dia.sucursales}
        celdas={dia.celdas}
        principal={{
          id: dia.principalId,
          sinDecorar: dia.sinDecorar,
          decorado: dia.decorado,
          restante: dia.restante,
          saldo: dia.saldoPrincipal,
          cambios: dia.cambios,
        }}
        batidas={batidas}
        pedidos={dia.pedidos}
        mandarOverride={dia.mandarOverride}
        arrastre={dia.arrastre}
      />
    </article>
  );
}
