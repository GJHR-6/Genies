import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import {
  cargarSugeridosDelDia,
  totalesPorProducto,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import { Fragment } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compararProductos } from "@/lib/orden-productos";
import { BotonImprimir } from "./boton-imprimir";
import { tandasPorProducto } from "@/lib/batidas";
import { HojaCuadro, type DatosBatidas } from "./hoja-cuadro";

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
  let batidas: DatosBatidas;
  try {
    const [diaCargado, areasRes, cierresRes, asignacionesRes, librasRes, ajustesRes] = await Promise.all([
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
      supabase
        .from("asignaciones")
        .select("producto_id, tipo, tanda, cantidad")
        .eq("fecha", fecha),
      supabase.from("productos").select("id, libras").eq("activo", true),
      supabase
        .from("batidas_ajuste")
        .select("producto_id, tipo, tanda, cantidad")
        .eq("fecha", fecha),
    ]);
    if (areasRes.error) throw new Error(areasRes.error.message);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    if (asignacionesRes.error) throw new Error(asignacionesRes.error.message);
    if (librasRes.error) throw new Error(librasRes.error.message);
    if (ajustesRes.error) throw new Error(ajustesRes.error.message);
    dia = diaCargado;
    // PROD por batida (del reparto), lo cambiado a mano en DEC / PROD y
    // libras, para el cuadro completo.
    const asignaciones = (asignacionesRes.data ?? []).map((a) => ({
      ...a,
      tipo: a.tipo === "decoracion" ? ("decoracion" as const) : ("produccion" as const),
    }));
    batidas = {
      prodReparto: Object.fromEntries(tandasPorProducto(asignaciones, "produccion")),
      ajustes: (ajustesRes.data ?? []).map((a) => ({
        ...a,
        tipo: a.tipo === "decoracion" ? ("decoracion" as const) : ("produccion" as const),
      })),
      libras: Object.fromEntries(
        (librasRes.data ?? [])
          .filter((p) => p.libras !== null && Number(p.libras) > 0)
          .map((p) => [p.id, Number(p.libras)])
      ),
    };
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
  // Dentro de cada cuadro, el orden del Excel (igual en todas las hojas).
  const porOrdenArea = (a: ProductoSugerido, b: ProductoSugerido) =>
    compararProductos(a, b);
  // Primero el cuadro completo (HojaCuadro): todos los productos en el
  // orden del Excel, como INVENTARIO DIARIO, para llenar y revisar el
  // SALDO. Después, uno por área.
  const ordenExcel = [...productos].sort(compararProductos);
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
    .sort(porOrdenArea);
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

  // Total, sin decorar en Principal y lo que falta hornear, por producto.
  const totales = totalesPorProducto(dia);
  const totalDe = (id: number) =>
    totales.get(id) ?? { total: 0, sinDecorar: 0, aProducir: 0, aDecorar: 0 };
  const haySinDecorar = Object.values(dia.sinDecorar).some((n) => n > 0);

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
        <Button asChild size="lg" variant="outline" className="print:hidden">
          <Link href="/cuadros/despacho">
            <Truck />
            Hojas de despacho
          </Link>
        </Button>
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

      {conRegla.length === 0 && (
        <Aviso tipo="info">
          Todavía no hay productos con objetivos. Agregalos en Catálogos →
          Objetivos por tienda.
        </Aviso>
      )}

      <p className="text-sm text-muted-foreground print:hidden">
        Primero el cuadro completo, igual que la hoja del Excel: ahí se llena
        lo que hay en Principal y lo que va a cada tienda. Después, una hoja por
        área. Al imprimir, cada cuadro va en su propia página.
      </p>

      {ordenExcel.length > 0 && (
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
            sucursales={sucursales}
            celdas={celdas}
            principal={{
              id: dia.principalId,
              sinDecorar: dia.sinDecorar,
              decorado: dia.decorado,
              saldo: dia.saldoPrincipal,
              cambios: dia.cambios,
            }}
            batidas={batidas}
            pedidos={dia.pedidos}
            mandarOverride={dia.mandarOverride}
          />
        </article>
      )}

      {!haySinDecorar && cuadros.length > 0 && (
        <Aviso tipo="info" className="print:hidden">
          Principal todavía no anotó pasteles sin decorar hoy: se hornea el
          total. Si hay sin decorar en el congelador o el enfriador, escribilos
          en la columna SIN DECO del cuadro completo.
        </Aviso>
      )}

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
                <th className="pl-2 py-1.5 text-right font-semibold">
                  {cuadro.titulo === "Decoración" ? "Decorar" : "Total"}
                </th>
                <th className="pl-2 py-1.5 text-right font-semibold">
                  Sin decorar
                </th>
                <th className="pl-2 py-1.5 text-right font-semibold">
                  Hornear
                </th>
              </tr>
            </thead>
            <tbody>
              {cuadro.productos.map((p, i) => {
                const porSucursal = sucursales.map((s) => sugeridoDe(p.id, s.id));
                const t = totalDe(p.id);
                // Título de sección (VAINILLA, CHOCOLATE…) cuando cambia,
                // como en el Excel.
                const seccion = p.categoria ?? "OTROS";
                const nuevaSeccion =
                  i === 0 || (cuadro.productos[i - 1].categoria ?? "OTROS") !== seccion;
                return (
                  <Fragment key={p.id}>
                  {nuevaSeccion && (
                    <tr className="border-b border-border bg-muted/50 print:border-black/60 print:bg-black/10">
                      <td
                        colSpan={sucursales.length + 4}
                        className="py-0.5 pr-2 text-xs font-bold uppercase tracking-wide"
                      >
                        {seccion}
                      </td>
                    </tr>
                  )}
                  <tr
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
                      {t.total}
                    </td>
                    <td
                      className={`pl-2 py-1.5 text-right tabular-nums ${
                        t.sinDecorar === 0
                          ? "text-muted-foreground print:text-black/50"
                          : ""
                      }`}
                    >
                      {t.sinDecorar}
                    </td>
                    <td className="pl-2 py-1.5 text-right text-base font-bold tabular-nums">
                      {t.aProducir}
                    </td>
                  </tr>
                  </Fragment>
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
                  {cuadro.productos.reduce((suma, p) => suma + totalDe(p.id).total, 0)}
                </td>
                <td className="pl-2 py-1.5 text-right tabular-nums">
                  {cuadro.productos.reduce(
                    (suma, p) => suma + totalDe(p.id).sinDecorar,
                    0
                  )}
                </td>
                <td className="pl-2 py-1.5 text-right tabular-nums">
                  {cuadro.productos.reduce(
                    (suma, p) => suma + totalDe(p.id).aProducir,
                    0
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-muted-foreground print:text-black/60">
            Los productos marcados con “Decorar” llevan decoración.{" "}
            <strong>Sin decorar</strong> = lo que Principal anotó hoy como hecho
            sin decorar; eso se decora primero y no se vuelve a hornear.{" "}
            <strong>Hornear</strong> = Total − Sin decorar. La producción de hoy
            se marca con color <strong>{color.nombre.toLowerCase()}</strong>.
          </p>
        </article>
      ))}
    </section>
  );
}
