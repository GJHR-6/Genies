import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import {
  cargarSugeridosDelDia,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import { BotonImprimir } from "./boton-imprimir";

export const dynamic = "force-dynamic";

type Cuadro = {
  titulo: string;
  encargadas: string | null;
  productos: ProductoSugerido[];
};

export default async function CuadrosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  const color = colorDelDia(fecha);

  // Domingo: no hay producción, no se generan cuadros.
  if (!color) {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="cuadros" />
        <Aviso tipo="info">
          Hoy es domingo: no hay producción. Los cuadros salen de lunes a
          sábado.
        </Aviso>
      </section>
    );
  }

  let dia: SugeridosDelDia;
  let areas: { id: number; nombre: string; encargadas: string }[];
  let cerradas = 0;
  try {
    const [diaCargado, areasRes, cierresRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("areas_produccion")
        .select("id, nombre, encargadas, pasteleras(nombre, activa, orden)")
        .eq("activa", true)
        .eq("es_decoracion", false)
        .order("orden"),
      supabase
        .from("cierres_dia")
        .select("estado")
        .eq("fecha", fecha)
        .eq("estado", "cerrado"),
    ]);
    if (areasRes.error) throw new Error(areasRes.error.message);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    dia = diaCargado;
    // Encargadas = pasteleras activas del área (si no hay, el texto original).
    areas = areasRes.data.map((a) => {
      const activas = [...(a.pasteleras ?? [])]
        .filter((p) => p.activa)
        .sort((x, y) => x.orden - y.orden)
        .map((p) => p.nombre);
      return {
        id: a.id,
        nombre: a.nombre,
        encargadas:
          activas.length > 0
            ? activas.join(activas.length === 2 ? " y " : ", ")
            : a.encargadas,
      };
    });
    cerradas = (cierresRes.data ?? []).length;
  } catch {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="cuadros" />
        <Aviso tipo="error">
          No se pudieron cargar los cuadros. Revisá que haya internet y recargá
          la página.
        </Aviso>
      </section>
    );
  }

  const { productos, sucursales, celdas } = dia;
  const pendientes = sucursales.length - cerradas;

  // Un cuadro por área de producción (pastelera); solo productos con alguna
  // regla de sugerido. Dentro del área se respeta el orden del Excel.
  const conRegla = productos.filter((p) =>
    sucursales.some((s) => celdas[`${p.id}-${s.id}`] !== undefined)
  );
  const porOrdenArea = (a: ProductoSugerido, b: ProductoSugerido) =>
    (a.orden_area ?? 0) - (b.orden_area ?? 0);
  const cuadros: Cuadro[] = areas
    .map((a) => ({
      titulo: a.nombre,
      encargadas: a.encargadas,
      productos: conRegla.filter((p) => p.area_id === a.id).sort(porOrdenArea),
    }))
    .filter((c) => c.productos.length > 0);

  // Decoración no es un área: su cuadro repite los productos marcados
  // "Decorar", en el mismo orden en que salen en los cuadros de las áreas.
  const idsPorArea = new Map(areas.map((a, i) => [a.id, i]));
  const decoracion = conRegla
    .filter((p) => p.lleva_decoracion)
    .sort(
      (a, b) =>
        (idsPorArea.get(a.area_id ?? -1) ?? areas.length) -
          (idsPorArea.get(b.area_id ?? -1) ?? areas.length) ||
        porOrdenArea(a, b)
    );
  if (decoracion.length > 0) {
    cuadros.push({ titulo: "Decoración", encargadas: null, productos: decoracion });
  }

  // Incluye los de un área desactivada en Catálogos, para que no se pierdan.
  const sinArea = conRegla.filter(
    (p) => p.area_id === null || !idsPorArea.has(p.area_id)
  );
  if (sinArea.length > 0) {
    cuadros.push({ titulo: "Sin área asignada", encargadas: null, productos: sinArea });
  }

  const sugeridoDe = (productoId: number, sucursalId: number): number | null =>
    celdas[`${productoId}-${sucursalId}`]?.sugerido ?? null;

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoSeccion
        grupo={GRUPO_HOY}
        actual="cuadros"
        detalle={
          <>
            <span className="first-letter:uppercase">{formatoLargo(fecha)}</span>
            <ChipColorDia fecha={fecha} />
          </>
        }
      >
        <BotonImprimir />
      </EncabezadoSeccion>

      {pendientes > 0 && (
        <Aviso tipo="aviso" className="print:hidden">
          {pendientes === 1
            ? "1 tienda todavía no termina su inventario"
            : `${pendientes} tiendas todavía no terminan su inventario`}
          : sus números pueden cambiar. Si imprimís ahora, revisalos después.
        </Aviso>
      )}

      {cuadros.length === 0 && (
        <Aviso tipo="info">
          Todavía no hay productos con objetivos. Agregalos en Catálogos →
          Objetivos por tienda.
        </Aviso>
      )}

      <p className="text-sm text-muted-foreground print:hidden">
        Sale una hoja por área. Al imprimir, cada cuadro va en su propia página.
      </p>

      {cuadros.map((cuadro) => (
        <article
          key={cuadro.titulo}
          className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0"
        >
          <header className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2 print:border-black">
            <h2 className="text-lg font-bold">
              {cuadro.titulo === "Decoración"
                ? "Cuadro de decoración"
                : `Cuadro de producción — ${cuadro.titulo}`}
              {cuadro.encargadas && (
                <span className="ml-2 text-base font-medium text-muted-foreground print:text-black/70">
                  {cuadro.encargadas}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground print:text-black">
                Gennie&apos;s · {formatoLargo(fecha)}
              </p>
              <ChipColorDia fecha={fecha} conEtiqueta />
            </div>
          </header>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border print:border-black">
                <th className="py-1.5 pr-2 text-left font-semibold">
                  Producto
                </th>
                {sucursales.map((s) => (
                  <th key={s.id} className="px-2 py-1.5 text-right font-semibold">
                    {s.nombre}
                  </th>
                ))}
                <th className="pl-2 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {cuadro.productos.map((p) => {
                const porSucursal = sucursales.map((s) => sugeridoDe(p.id, s.id));
                const total = porSucursal.reduce<number>(
                  (suma, v) => suma + (v ?? 0),
                  0
                );
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-b-0 print:border-black/40"
                  >
                    <td className="py-1.5 pr-2 font-medium">
                      {p.nombre}
                      {p.tamano ? ` · ${p.tamano}` : ""}
                      {p.lleva_decoracion && (
                        <span className="ml-2 rounded border border-primary px-1 py-0.5 text-[10px] font-semibold uppercase text-primary print:border-black print:text-black">
                          Decorar
                        </span>
                      )}
                    </td>
                    {porSucursal.map((valor, i) => (
                      <td
                        key={sucursales[i].id}
                        className={`px-2 py-1.5 text-right tabular-nums ${
                          valor === null || valor === 0
                            ? "text-muted-foreground print:text-black/50"
                            : ""
                        }`}
                      >
                        {valor ?? "—"}
                      </td>
                    ))}
                    <td className="pl-2 py-1.5 text-right font-semibold tabular-nums">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold print:border-black">
                <td className="py-1.5 pr-2">Total</td>
                {sucursales.map((s) => {
                  const total = cuadro.productos.reduce(
                    (suma, p) => suma + (sugeridoDe(p.id, s.id) ?? 0),
                    0
                  );
                  return (
                    <td key={s.id} className="px-2 py-1.5 text-right tabular-nums">
                      {total}
                    </td>
                  );
                })}
                <td className="pl-2 py-1.5 text-right tabular-nums">
                  {cuadro.productos.reduce(
                    (suma, p) =>
                      suma +
                      sucursales.reduce(
                        (st, s) => st + (sugeridoDe(p.id, s.id) ?? 0),
                        0
                      ),
                    0
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-muted-foreground print:text-black/60">
            Los productos marcados con “Decorar” llevan decoración. La
            producción de hoy se marca con color{" "}
            <strong>{color.nombre.toLowerCase()}</strong>.
          </p>
        </article>
      ))}
    </section>
  );
}
