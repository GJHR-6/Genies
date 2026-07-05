import { obtenerPerfil } from "@/lib/supabase/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, diaAnterior, formatoLargo } from "@/lib/fechas";
import { CapturaCliente } from "./captura-cliente";

export const dynamic = "force-dynamic";

export default async function CapturaPage() {
  const perfil = await obtenerPerfil();

  if (!perfil?.sucursalId) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Captura del día</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tu usuario no tiene sucursal asignada. Contactá a la administración.
        </p>
      </section>
    );
  }

  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  const ayer = diaAnterior(fecha);
  const sucursalId = perfil.sucursalId;

  const [productosRes, movimientosRes, previosRes, cierreRes, sucursalRes] =
    await Promise.all([
      supabase
        .from("productos")
        .select("id, nombre, categoria, tamano, lleva_decoracion")
        .eq("activo", true)
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("movimientos_diarios")
        .select(
          "producto_id, saldo_inicial, ingreso, devolucion, pedido, decorado, sin_decorar"
        )
        .eq("fecha", fecha)
        .eq("sucursal_id", sucursalId),
      supabase
        .from("movimientos_diarios")
        .select("producto_id, saldo_inicial, ingreso, devolucion, saldo_final")
        .eq("fecha", ayer)
        .eq("sucursal_id", sucursalId),
      supabase
        .from("cierres_dia")
        .select("estado")
        .eq("fecha", fecha)
        .eq("sucursal_id", sucursalId)
        .maybeSingle(),
      supabase
        .from("sucursales")
        .select("es_principal")
        .eq("id", sucursalId)
        .single(),
    ]);

  const error =
    productosRes.error ??
    movimientosRes.error ??
    previosRes.error ??
    cierreRes.error ??
    sucursalRes.error;
  if (error) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Captura del día</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página; si el problema
          sigue, avisá a la administración.
        </p>
      </section>
    );
  }

  // Saldo anterior por producto: saldo final de ayer, o el calculado si no se contó.
  const saldosAnteriores: Record<number, number> = {};
  for (const m of previosRes.data ?? []) {
    saldosAnteriores[m.producto_id] =
      m.saldo_final ?? Math.max(m.saldo_inicial + m.ingreso - m.devolucion, 0);
  }

  return (
    <CapturaCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      sucursalId={sucursalId}
      sucursalNombre={perfil.sucursalNombre ?? ""}
      userId={perfil.userId}
      esPrincipal={sucursalRes.data?.es_principal ?? false}
      cerradoInicial={cierreRes.data?.estado === "cerrado"}
      productos={productosRes.data ?? []}
      movimientosIniciales={movimientosRes.data ?? []}
      saldosAnteriores={saldosAnteriores}
    />
  );
}
