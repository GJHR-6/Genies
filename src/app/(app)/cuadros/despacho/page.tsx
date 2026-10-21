import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import {
  cargarSugeridosDelDia,
  totalesPorProducto,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import {
  formatoLibras,
  formatoTandas,
  librasPorBatida,
  MAX_LIBRAS_BATIDA,
  tandasPorProducto,
  type BatidasMasa,
} from "@/lib/batidas";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso } from "@/components/encabezado-seccion";
import { ordenarProductos } from "@/lib/orden-productos";
import { filaHojaCompleta, type FilaHojaCompleta } from "@/lib/hoja-completa";
import { BotonImprimir } from "../boton-imprimir";

export const dynamic = "force-dynamic";

/**
 * Hojas de despacho (reunión 16 oct 2026):
 *  1. Hoja completa, igual que INVENTARIO DIARIO del Excel (la que se le
 *     da a la muchacha que empaca): DECO, SIN DECO e INV/TOTAL de
 *     Principal, lo que se manda y el CM (cambio) de cada tienda, y el
 *     SALDO de CM que la dueña pidió agregar (20 oct 2026).
 *     A la derecha, como en el Excel (21 oct 2026): DEC y PROD por batida
 *     ("39*2" = 39 en la primera y 2 en la segunda, salen del reparto) y
 *     el Sugerido; en la fila de cada masa, las libras por batida (máximo
 *     100 lb).
 *  2. Una hoja por tienda: lo que le toca, su saldo y los colores con que
 *     se decoran sus pasteles, para tachar lo enviado y anotar lo que
 *     quedó pendiente (la tienda lo vuelve a pedir en la tarde).
 */
export default async function DespachoPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  if (!colorDelDia(fecha)) {
    return (
      <section className="flex flex-col gap-4">
        <Encabezado fecha={fecha} />
        <Aviso tipo="info">Hoy es domingo: no hay despacho.</Aviso>
      </section>
    );
  }

  let dia: SugeridosDelDia;
  let asignaciones: {
    producto_id: number;
    tipo: "produccion" | "decoracion";
    tanda: number;
    cantidad: number;
  }[];
  let libras: Record<number, number | null>;
  let colores: Record<number, string>;
  try {
    const [d, asignacionesRes, librasRes, coloresRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("asignaciones")
        .select("producto_id, tipo, tanda, cantidad")
        .eq("fecha", fecha),
      supabase.from("productos").select("id, libras").eq("activo", true),
      supabase
        .from("sucursales")
        .select("id, colores_decoracion")
        .eq("activa", true),
    ]);
    const error = asignacionesRes.error ?? librasRes.error ?? coloresRes.error;
    if (error) throw new Error(error.message);
    dia = d;
    asignaciones = (asignacionesRes.data ?? []).map((a) => ({
      ...a,
      tipo: a.tipo === "decoracion" ? "decoracion" : "produccion",
    }));
    libras = Object.fromEntries(
      (librasRes.data ?? []).map((p) => [
        p.id,
        p.libras === null ? null : Number(p.libras),
      ])
    );
    colores = Object.fromEntries(
      (coloresRes.data ?? [])
        .filter((s) => s.colores_decoracion?.trim())
        .map((s) => [s.id, s.colores_decoracion!.trim()])
    );
  } catch {
    return (
      <section className="flex flex-col gap-4">
        <Encabezado fecha={fecha} />
        <Aviso tipo="error">
          No se pudieron cargar las hojas. Revisá que haya internet y recargá
          la página.
        </Aviso>
      </section>
    );
  }

  const { sucursales, celdas } = dia;
  const pedido = (productoId: number, sucursalId: number) =>
    celdas[`${productoId}-${sucursalId}`]?.sugerido ?? 0;

  // Orden del Excel (INVENTARIO DIARIO), igual en todas las hojas.
  const todos = ordenarProductos(dia.productos);
  const productos = todos.filter((p) =>
    sucursales.some((s) => pedido(p.id, s.id) > 0)
  );
  // En la hoja completa Principal no es columna: es el INV/TOTAL.
  const tiendas = sucursales.filter((s) => s.id !== dia.principalId);

  // DEC / PROD por batida (del reparto), Sugerido y libras por masa.
  const totales = totalesPorProducto(dia);
  const dec = tandasPorProducto(asignaciones, "decoracion");
  const prod = tandasPorProducto(asignaciones, "produccion");
  const batidas = new Map<string, BatidasMasa>(
    librasPorBatida(
      asignaciones,
      todos.map((p) => ({ ...p, libras: libras[p.id] ?? null }))
    ).map((b) => [b.masa, b])
  );
  const conColores = sucursales.filter((s) => colores[s.id]);

  // Filas de la hoja completa con encabezado de sección, como el Excel.
  type Renglon =
    | { tipo: "seccion"; nombre: string; batidas: BatidasMasa | undefined }
    | { tipo: "producto"; producto: ProductoSugerido; fila: FilaHojaCompleta };
  const renglones: Renglon[] = [];
  let seccionActual: string | null = null;
  for (const p of todos) {
    const seccion = p.categoria ?? "OTROS";
    if (seccion !== seccionActual) {
      renglones.push({
        tipo: "seccion",
        nombre: seccion,
        batidas: batidas.get(seccion),
      });
      seccionActual = seccion;
    }
    renglones.push({
      tipo: "producto",
      producto: p,
      fila: filaHojaCompleta(dia, p, tiendas),
    });
  }

  const num = (n: number | null) => (n === null || n === 0 ? "" : n);

  return (
    <section className="flex flex-col gap-4">
      <Encabezado fecha={fecha} />

      {todos.length === 0 && (
        <Aviso tipo="info">Todavía no hay productos activos.</Aviso>
      )}

      {todos.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground print:hidden">
            Primero sale la hoja completa (igual que INVENTARIO DIARIO, con el
            SALDO de CM) y después una hoja por tienda. Cada una va en su propia
            página al imprimir.
          </p>

          {/* 1. Hoja completa: réplica de INVENTARIO DIARIO + SALDO */}
          <article className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0">
            <EncabezadoHoja
              titulo="Inventario diario — hoja completa"
              fecha={fecha}
              nota={`Por tienda: lo que se manda y CM (cambio). SALDO = INV/TOTAL + CM − lo que se manda; en rojo, lo que falta. DEC y PROD: cuánto se decora y se hornea en cada batida (39*2 = 39 en la primera y 2 en la segunda). En la fila de cada masa, las libras por batida (máximo ${MAX_LIBRAS_BATIDA} lb).`}
            />
            {conColores.length > 0 && <ColoresTiendas sucursales={conColores} colores={colores} />}
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[900px] border-collapse text-[12px] print:min-w-0 print:text-[9.5px]">
                <thead>
                  <tr className="border-b-2 border-border print:border-black">
                    <th className="py-1 pr-2 text-left font-semibold">PRODUCTO</th>
                    <th className="px-1 py-1 text-center font-semibold">DECO</th>
                    <th className="px-1 py-1 text-center font-semibold">SIN DECO</th>
                    <th className="border-r px-1 py-1 text-center font-semibold print:border-black">
                      INV/ TOTAL
                    </th>
                    {tiendas.map((t) => (
                      <Fragment key={t.id}>
                        <th className="px-1 py-1 text-center font-semibold uppercase">
                          {t.nombre}
                        </th>
                        <th className="border-r px-1 py-1 text-center font-semibold print:border-black">
                          CM
                        </th>
                      </Fragment>
                    ))}
                    <th className="border-r px-1 py-1 text-center font-semibold print:border-black">
                      SALDO
                    </th>
                    <th className="px-1 py-1 text-center font-semibold">
                      DEC
                      <div className="text-[9px] font-normal">1*2*3*4</div>
                    </th>
                    <th className="px-1 py-1 text-center font-semibold">
                      PROD
                      <div className="text-[9px] font-normal">1*2*3*4</div>
                    </th>
                    <th className="px-1 py-1 text-center font-semibold">Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((r, i) =>
                    r.tipo === "seccion" ? (
                      <tr
                        key={`s-${i}`}
                        className="border-b border-border bg-muted/50 print:border-black/60 print:bg-black/10"
                      >
                        <td
                          colSpan={5 + tiendas.length * 2}
                          className="py-0.5 pr-2 font-bold uppercase"
                        >
                          {r.nombre}
                        </td>
                        <td
                          colSpan={3}
                          className={`px-1 py-0.5 text-center font-semibold tabular-nums ${
                            r.batidas?.excedidas.length
                              ? "text-destructive print:text-black print:underline"
                              : ""
                          }`}
                          title={
                            r.batidas?.excedidas.length
                              ? `Se pasa de ${MAX_LIBRAS_BATIDA} lb en la batida ${r.batidas.excedidas.join(", ")}`
                              : undefined
                          }
                        >
                          {r.batidas ? formatoLibras(r.batidas.libras) : ""}
                          {r.batidas?.excedidas.length ? " ⚠" : ""}
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={r.producto.id}
                        className="border-b border-border/60 print:border-black/30"
                      >
                        <td className="py-0.5 pr-2">{nombre(r.producto)}</td>
                        <td className="px-1 py-0.5 text-center tabular-nums">
                          {num(r.fila.deco)}
                        </td>
                        <td className="px-1 py-0.5 text-center tabular-nums">
                          {num(r.fila.sinDeco)}
                        </td>
                        <td className="border-r px-1 py-0.5 text-center font-semibold tabular-nums print:border-black">
                          {num(r.fila.invTotal)}
                        </td>
                        {r.fila.tiendas.map((t) => (
                          <Fragment key={t.sucursalId}>
                            <td className="px-1 py-0.5 text-center tabular-nums">
                              {t.mandar ?? ""}
                            </td>
                            <td className="border-r px-1 py-0.5 text-center tabular-nums print:border-black">
                              {num(t.cm)}
                            </td>
                          </Fragment>
                        ))}
                        <td
                          className={`border-r px-1 py-0.5 text-center font-bold tabular-nums print:border-black ${
                            r.fila.saldo < 0 ? "text-destructive print:text-black" : ""
                          }`}
                        >
                          {r.fila.saldo === 0 ? "" : r.fila.saldo}
                        </td>
                        <td className="px-1 py-0.5 text-center tabular-nums">
                          {formatoTandas(dec.get(r.producto.id) ?? [])}
                        </td>
                        <td className="px-1 py-0.5 text-center tabular-nums">
                          {formatoTandas(prod.get(r.producto.id) ?? [])}
                        </td>
                        <td className="px-1 py-0.5 text-center font-semibold tabular-nums">
                          {num(totales.get(r.producto.id)?.total ?? null)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <Firmas />
          </article>

          {/* 2. Una hoja por tienda */}
          {sucursales.map((s) => {
            const suyos = productos.filter((p) => pedido(p.id, s.id) > 0);
            if (suyos.length === 0) return null;
            return (
              <article
                key={s.id}
                className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0"
              >
                <EncabezadoHoja
                  titulo={`Despacho — ${s.nombre}`}
                  fecha={fecha}
                  nota="Tachá lo que se mandó. Lo que no se mandó queda pendiente: la tienda lo vuelve a pedir en la tarde (no se manda doble). Saldo = lo que la tienda tenía en su inventario de hoy."
                />
                {colores[s.id] && (
                  <p className="mb-3 rounded-md border px-3 py-2 text-sm print:border-black">
                    <span className="font-semibold">Colores de los pasteles:</span>{" "}
                    {colores[s.id]}
                  </p>
                )}
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-black">
                      <th className="py-1 pr-2 text-left font-semibold">Producto</th>
                      <th className="px-2 py-1 text-right font-semibold">Saldo</th>
                      <th className="px-2 py-1 text-right font-semibold">Mandar</th>
                      <th className="w-20 px-2 py-1 text-center font-semibold">Enviado</th>
                      <th className="w-24 px-2 py-1 text-center font-semibold">
                        No se mandó
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suyos.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-border/60 print:border-black/40"
                      >
                        <td className="py-1.5 pr-2 font-medium">{nombre(p)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {celdas[`${p.id}-${s.id}`]?.saldo ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-base font-bold tabular-nums">
                          {pedido(p.id, s.id)}
                        </td>
                        <td className="px-2 py-1.5 text-center">☐</td>
                        <td className="px-2 py-1.5 text-center">______</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold print:border-black">
                      <td className="py-1.5 pr-2">Total</td>
                      <td />
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {suyos.reduce((t, p) => t + pedido(p.id, s.id), 0)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
                <Firmas />
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}

/** Leyenda de colores de decoración por tienda (Catálogos → Tiendas). */
function ColoresTiendas({
  sucursales,
  colores,
}: {
  sucursales: { id: number; nombre: string }[];
  colores: Record<number, string>;
}) {
  return (
    <div className="mb-3 rounded-md border px-3 py-2 text-xs print:border-black print:text-[9.5px]">
      <p className="font-semibold">Colores de los pasteles por tienda</p>
      <ul className="mt-1 grid gap-x-6 gap-y-0.5 sm:grid-cols-2 print:grid-cols-2">
        {sucursales.map((s) => (
          <li key={s.id}>
            <span className="font-semibold uppercase">{s.nombre}:</span> {colores[s.id]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function nombre(p: ProductoSugerido) {
  return `${p.nombre}${p.tamano ? ` · ${p.tamano}` : ""}`;
}

function Encabezado({ fecha }: { fecha: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <div>
        <h1 className="text-xl font-bold">Hojas de despacho</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatoLargo(fecha)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/cuadros"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Cuadros
        </Link>
        <BotonImprimir texto="Imprimir hojas" />
      </div>
    </div>
  );
}

function EncabezadoHoja({
  titulo,
  fecha,
  nota,
}: {
  titulo: string;
  fecha: string;
  nota: string;
}) {
  return (
    <header className="mb-3 border-b pb-2 print:border-black">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground print:text-black">
            Gennie&apos;s · {formatoLargo(fecha)}
          </p>
          <ChipColorDia fecha={fecha} conEtiqueta />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground print:text-black/70">{nota}</p>
    </header>
  );
}

function Firmas() {
  return (
    <p className="mt-6 text-sm print:text-black">
      Revisó: ______________________ &nbsp;&nbsp; Hora de salida: __________
    </p>
  );
}
