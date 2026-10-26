import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { ChipColorDia } from "@/components/color-dia";
import {
  cargarReparto,
  idsAreasEnEquipo,
  nombreHoja,
  nombreProducto,
  type DatosReparto,
  type PasteleraDia,
} from "@/lib/asignaciones";
import { tareasPorTanda } from "@/lib/secciones-reparto";
import { BotonImprimir } from "../../cuadros/boton-imprimir";

export const dynamic = "force-dynamic";

/**
 * Una hoja carta por pastelera con su trabajo del día, por tanda. Las
 * áreas en equipo sacan una sola hoja con el nombre de todo el equipo.
 */
export default async function ImprimirRepartoPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  let datos: DatosReparto;
  try {
    datos = await cargarReparto(supabase, fecha);
  } catch {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No se pudieron cargar los datos. Recargá la página.
      </p>
    );
  }

  const productoPorId = new Map(datos.productos.map((p) => [p.id, p]));
  const areasEnEquipo = idsAreasEnEquipo(datos.areas);
  const areaPorId = new Map(datos.areas.map((a) => [a.id, a]));
  // Orden del Excel (productos.orden), igual que en todas las hojas.
  const ordenProducto = (id: number) => productoPorId.get(id)?.orden ?? 99999;

  const hojas: { pastelera: PasteleraDia | null; titulo: string; area: string }[] = [
    ...datos.pasteleras
      .filter((p) => datos.asignaciones.some((a) => a.pastelera_id === p.id && a.cantidad > 0))
      .sort(
        (a, b) =>
          (areaPorId.get(a.area_id)?.orden ?? 99) - (areaPorId.get(b.area_id)?.orden ?? 99) ||
          a.orden - b.orden
      )
      .map((p) => ({
        pastelera: p,
        // En un área en equipo la hoja es de todas: "Kenia y Dany".
        titulo: nombreHoja(p, datos.pasteleras, areasEnEquipo),
        area: areaPorId.get(p.area_id)?.nombre ?? "",
      })),
  ];
  if (datos.asignaciones.some((a) => a.pastelera_id === null && a.cantidad > 0)) {
    hojas.push({ pastelera: null, titulo: "Sin asignar", area: "Repartir a mano" });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">Hojas por pastelera</h1>
          <p className="text-sm text-muted-foreground">{formatoLargo(fecha)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada pastelera sale en su propia página. Si cambiás el reparto,
            imprimí de nuevo.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/asignar"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Reparto
          </Link>
          <BotonImprimir texto="Imprimir hojas" />
        </div>
      </div>

      {hojas.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Todavía no hay reparto para hoy.{" "}
          <Link href="/asignar" className="font-semibold text-primary underline">
            Hacer el reparto
          </Link>
        </p>
      )}

      {hojas.map((hoja) => {
        const grupos = tareasPorTanda(datos.asignaciones, hoja.pastelera?.id ?? null, ordenProducto);
        return (
          <article
            key={hoja.pastelera?.id ?? "x"}
            className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0"
          >
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 print:border-black">
              <h2 className="text-2xl font-bold">
                {hoja.titulo}
                <span className="ml-2 text-base font-medium text-muted-foreground print:text-black/70">
                  {hoja.area}
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground print:text-black">
                  Gennie&apos;s · {formatoLargo(fecha)}
                </p>
                <ChipColorDia fecha={fecha} conEtiqueta />
              </div>
            </header>
            {grupos.map(({ tanda, tareas }) => (
              <div key={tanda} className="mb-4">
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">
                  Tanda {tanda}
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-black">
                      <th className="py-1 pr-2 text-left font-semibold">Producto</th>
                      <th className="px-2 py-1 text-left font-semibold">Tarea</th>
                      <th className="px-2 py-1 text-right font-semibold">Cantidad</th>
                      <th className="w-20 pl-2 py-1 text-center font-semibold">Hecho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tareas]
                      .sort(
                        (a, b) =>
                          (a.tipo === b.tipo ? 0 : a.tipo === "produccion" ? -1 : 1) ||
                          ordenProducto(a.producto_id) - ordenProducto(b.producto_id)
                      )
                      .map((t) => {
                        const p = productoPorId.get(t.producto_id);
                        return (
                          <tr key={t.id} className="border-b border-border/60 print:border-black/40">
                            <td className="py-1.5 pr-2 font-medium">
                              {p ? nombreProducto(p) : `Producto ${t.producto_id}`}
                            </td>
                            <td className="px-2 py-1.5">
                              {t.tipo === "decoracion" ? "Decorar" : "Producir"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-base font-bold tabular-nums">
                              {t.cantidad}
                            </td>
                            <td className="pl-2 py-1.5 text-center">☐</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="mt-6 text-sm print:text-black">
              Firma: ______________________ &nbsp;&nbsp; Hora de entrega: __________
            </p>
          </article>
        );
      })}
    </section>
  );
}
