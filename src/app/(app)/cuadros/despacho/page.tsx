import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import {
  cargarSugeridosDelDia,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso } from "@/components/encabezado-seccion";
import { BotonImprimir } from "../boton-imprimir";

export const dynamic = "force-dynamic";

/**
 * Hojas de despacho (reunión 16 oct 2026):
 *  1. Hoja completa para la muchacha que empaca: todo lo que sale hoy, por
 *     tienda, con casilla para marcar lo que se fue y espacio para anotar
 *     cuánto se mandó si no salió completo. Es "los últimos ojos".
 *  2. Una hoja por tienda: lo que le toca, para tachar lo enviado y anotar
 *     lo que quedó pendiente (la tienda lo vuelve a pedir en la tarde).
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
  let ordenArea: Map<number, number>;
  try {
    const [cargado, areasRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase.from("areas_produccion").select("id, orden"),
    ]);
    if (areasRes.error) throw new Error(areasRes.error.message);
    dia = cargado;
    ordenArea = new Map((areasRes.data ?? []).map((a) => [a.id, a.orden]));
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

  // Mismo orden que los cuadros: por área y, dentro, por el orden del Excel.
  const productos = dia.productos
    .filter((p) => sucursales.some((s) => pedido(p.id, s.id) > 0))
    .sort(
      (a, b) =>
        (ordenArea.get(a.area_id ?? -1) ?? 999) -
          (ordenArea.get(b.area_id ?? -1) ?? 999) ||
        (a.orden_area ?? 9999) - (b.orden_area ?? 9999) ||
        a.nombre.localeCompare(b.nombre)
    );

  return (
    <section className="flex flex-col gap-4">
      <Encabezado fecha={fecha} />

      {productos.length === 0 && (
        <Aviso tipo="info">Hoy no hay nada para mandar a las tiendas.</Aviso>
      )}

      {productos.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground print:hidden">
            Primero sale la hoja completa (para quien empaca) y después una hoja
            por tienda. Cada una va en su propia página al imprimir.
          </p>

          {/* 1. Hoja completa para empaque */}
          <article className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0">
            <EncabezadoHoja
              titulo="Hoja de despacho — empaque"
              fecha={fecha}
              nota="Marcá ✓ lo que salió completo. Si no salió completo, anotá cuánto se mandó."
            />
            <table className="w-full border-collapse text-[13px] print:text-[11px]">
              <thead>
                <tr className="border-b-2 border-border print:border-black">
                  <th className="py-1 pr-2 text-left font-semibold">Producto</th>
                  {sucursales.map((s) => (
                    <th key={s.id} className="px-1 py-1 text-center font-semibold">
                      {s.nombre}
                    </th>
                  ))}
                  <th className="pl-2 py-1 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 print:border-black/40"
                  >
                    <td className="py-1 pr-2 font-medium">{nombre(p)}</td>
                    {sucursales.map((s) => {
                      const n = pedido(p.id, s.id);
                      return (
                        <td key={s.id} className="px-1 py-1 text-center">
                          {n > 0 ? (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <strong>{n}</strong>
                              <span className="inline-block h-4 w-7 border border-current align-middle opacity-60" />
                            </span>
                          ) : (
                            <span className="text-muted-foreground print:text-black/40">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="pl-2 py-1 text-right font-semibold tabular-nums">
                      {sucursales.reduce((t, s) => t + pedido(p.id, s.id), 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  nota="Tachá lo que se mandó. Lo que no se mandó queda pendiente: la tienda lo vuelve a pedir en la tarde (no se manda doble)."
                />
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border print:border-black">
                      <th className="py-1 pr-2 text-left font-semibold">Producto</th>
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
