import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { colorDelDia } from "@/lib/color-dia";
import { cargarSugeridosDelDia, totalesPorProducto } from "@/lib/sugeridos";
import { prodEscritoPorBatida } from "@/lib/batidas";
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
    const [reparto, dia, cierresRes, ajustesRes] = await Promise.all([
      cargarReparto(supabase, fecha),
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("cierres_dia")
        .select("sucursal_id")
        .eq("fecha", fecha)
        .eq("estado", "cerrado"),
      supabase
        .from("batidas_ajuste")
        .select("producto_id, tipo, tanda, cantidad")
        .eq("fecha", fecha)
        .eq("tipo", "produccion"),
    ]);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    if (ajustesRes.error) throw new Error(ajustesRes.error.message);
    datos = reparto;
    // Con PROD escrito por batida en el cuadro completo, eso es lo que se
    // hornea (el reparto sale en esas tandas).
    const escrito = prodEscritoPorBatida(
      (ajustesRes.data ?? []).map((x) => ({ ...x, tipo: "produccion" as const }))
    );
    totalesCuadro = Object.fromEntries(
      [...totalesPorProducto(dia)].map(([id, t]) => [
        id,
        {
          produccion: escrito.has(id)
            ? escrito.get(id)!.reduce((s, c) => s + c, 0)
            : t.aProducir,
          decoracion: t.aDecorar,
          sinDecorar: escrito.has(id) ? 0 : t.sinDecorar,
        },
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
