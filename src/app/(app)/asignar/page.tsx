import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { colorDelDia } from "@/lib/color-dia";
import { cargarSugeridosDelDia } from "@/lib/sugeridos";
import { cargarReparto, type DatosReparto } from "@/lib/asignaciones";
import { AsignarCliente } from "./asignar-cliente";

export const dynamic = "force-dynamic";

export default async function AsignarPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  if (!colorDelDia(fecha)) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Reparto de producción</h1>
        <p className="text-sm text-muted-foreground">{formatoLargo(fecha)}</p>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Hoy es domingo: no hay producción ni reparto.
        </p>
      </section>
    );
  }

  let datos: DatosReparto;
  let totalesCuadro: Record<number, number> = {};
  let pendientes = 0;
  try {
    const [reparto, dia, cierresRes] = await Promise.all([
      cargarReparto(supabase, fecha),
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("cierres_dia")
        .select("sucursal_id")
        .eq("fecha", fecha)
        .eq("estado", "cerrado"),
    ]);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    datos = reparto;
    totalesCuadro = Object.fromEntries(
      dia.productos.map((p) => [
        p.id,
        dia.sucursales.reduce(
          (suma, s) => suma + (dia.celdas[`${p.id}-${s.id}`]?.sugerido ?? 0),
          0
        ),
      ])
    );
    pendientes = dia.sucursales.length - (cierresRes.data ?? []).length;
  } catch {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Reparto de producción</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  return (
    <AsignarCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      datos={datos}
      totalesCuadro={totalesCuadro}
      sucursalesPendientes={pendientes}
    />
  );
}
