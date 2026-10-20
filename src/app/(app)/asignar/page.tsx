import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { colorDelDia } from "@/lib/color-dia";
import { cargarSugeridosDelDia, totalesPorProducto } from "@/lib/sugeridos";
import {
  cargarReparto,
  type DatosReparto,
  type TotalesCuadro,
} from "@/lib/asignaciones";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import { AsignarCliente } from "./asignar-cliente";

export const dynamic = "force-dynamic";

export default async function AsignarPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  if (!colorDelDia(fecha)) {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="reparto" />
        <Aviso tipo="info">Hoy es domingo: no hay producción ni reparto.</Aviso>
      </section>
    );
  }

  let datos: DatosReparto;
  let totalesCuadro: TotalesCuadro = {};
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
      [...totalesPorProducto(dia)].map(([id, t]) => [
        id,
        { produccion: t.aProducir, decoracion: t.aDecorar, sinDecorar: t.sinDecorar },
      ])
    );
    pendientes = dia.sucursales.length - (cierresRes.data ?? []).length;
  } catch {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="reparto" />
        <Aviso tipo="error">
          No se pudo cargar el reparto. Revisá que haya internet y recargá la
          página.
        </Aviso>
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
