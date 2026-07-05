import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { resumirDia } from "@/lib/resumen-dia";
import { DashboardCliente } from "./dashboard-cliente";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  const [sucursalesRes, productosRes, movimientosRes, cierresRes] =
    await Promise.all([
      supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("activa", true)
        .order("id"),
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("activo", true),
      supabase
        .from("movimientos_diarios")
        .select("sucursal_id, producto_id, updated_at")
        .eq("fecha", fecha),
      supabase
        .from("cierres_dia")
        .select("sucursal_id, estado")
        .eq("fecha", fecha),
    ]);

  const sucursales = sucursalesRes.data ?? [];

  return (
    <DashboardCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      sucursales={sucursales}
      totalProductos={productosRes.count ?? 0}
      resumenInicial={resumirDia(
        sucursales,
        movimientosRes.data ?? [],
        cierresRes.data ?? []
      )}
    />
  );
}
