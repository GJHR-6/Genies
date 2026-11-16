import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, fechaElegida, formatoLargo } from "@/lib/fechas";
import { ElegirDia } from "@/components/elegir-dia";
import {
  cargarSugeridosDelDia,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import { colorDelDia } from "@/lib/color-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso } from "@/components/encabezado-seccion";
import { ordenarProductos } from "@/lib/orden-productos";
import { aMandar } from "@/lib/hoja-completa";
import { BotonImprimir } from "../boton-imprimir";
import { cuandoFue, DIAS_PENDIENTES } from "@/lib/no-enviados";

export const dynamic = "force-dynamic";

/**
 * Hojas de despacho (reunión 16 oct 2026): una hoja por tienda con lo que
 * le toca y su saldo, para tachar lo enviado; abajo, lo que quedó pendiente
 * de días anteriores. La "hoja completa" (INVENTARIO DIARIO) se quitó el
 * 16 nov: era lo mismo que el cuadro completo de /cuadros, que se imprime
 * solo con "Cuadro completo".
 */
export default async function DespachoPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const supabase = await createClient();
  // Hoy, o un día anterior para revisarlo o reimprimirlo (?fecha=).
  const hoy = hoyTegucigalpa();
  const fecha = fechaElegida(fechaParam, hoy);

  if (!colorDelDia(fecha)) {
    return (
      <section className="flex flex-col gap-4">
        <Encabezado fecha={fecha} hoy={hoy} />
        <Aviso tipo="info">Ese día es domingo: no hay despacho.</Aviso>
      </section>
    );
  }

  let dia: SugeridosDelDia;
  let pendientes: { id: number; fecha: string; sucursal_id: number; producto_id: number; cantidad: number }[];
  const desde = new Date(`${fecha}T12:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - DIAS_PENDIENTES);
  try {
    const [d, pendientesRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      // Lo que no salió días anteriores y sigue pendiente (va en la hoja de la tienda).
      supabase
        .from("no_enviados")
        .select("id, fecha, sucursal_id, producto_id, cantidad")
        .is("enviado_at", null)
        .lt("fecha", fecha)
        .gte("fecha", desde.toISOString().slice(0, 10))
        .order("fecha"),
    ]);
    if (pendientesRes.error) throw new Error(pendientesRes.error.message);
    dia = d;
    pendientes = pendientesRes.data ?? [];
  } catch {
    return (
      <section className="flex flex-col gap-4">
        <Encabezado fecha={fecha} hoy={hoy} />
        <Aviso tipo="error">
          No se pudieron cargar las hojas. Revisá que haya internet y recargá
          la página.
        </Aviso>
      </section>
    );
  }

  const { sucursales, celdas } = dia;
  // Lo que se manda: a las tiendas, su pedido (o el ajuste del admin en el
  // cuadro completo); a Principal, su sugerido.
  const pedido = (productoId: number, sucursalId: number) =>
    sucursalId === dia.principalId
      ? (celdas[`${productoId}-${sucursalId}`]?.sugerido ?? 0)
      : (aMandar(dia, `${productoId}-${sucursalId}`).mandar ?? 0);

  // Orden del Excel (INVENTARIO DIARIO), igual en todas las hojas.
  const todos = ordenarProductos(dia.productos);
  const productos = todos.filter((p) =>
    sucursales.some((s) => pedido(p.id, s.id) > 0)
  );

  return (
    <section className="flex flex-col gap-4">
      <Encabezado fecha={fecha} hoy={hoy} />

      {todos.length === 0 && (
        <Aviso tipo="info">Todavía no hay productos activos.</Aviso>
      )}

      {sucursales.map((s) => {
        const suyos = productos.filter((p) => pedido(p.id, s.id) > 0);
        const deAntes = pendientes.filter((n) => n.sucursal_id === s.id);
        if (suyos.length === 0 && deAntes.length === 0) return null;
        return (
          <article
            key={s.id}
            className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0"
          >
            <EncabezadoHoja
              titulo={`Despacho — ${s.nombre}`}
              fecha={fecha}
              nota="Tachá lo que se mandó. Lo que no se mandó se anota en el sistema (Hoy → Lo que no se mandó) y queda pendiente hasta que se manda; no se manda doble. Saldo = lo que la tienda tenía en su inventario de hoy."
            />
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
            {deAntes.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-1 text-sm font-bold">
                  Pendiente de días anteriores (no se mandó)
                </h3>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {deAntes.map((n) => {
                      const prod = todos.find((p) => p.id === n.producto_id);
                      return (
                        <tr key={n.id} className="border-b border-border/60 print:border-black/40">
                          <td className="py-1.5 pr-2 font-medium">
                            {prod ? nombre(prod) : `Producto ${n.producto_id}`}
                            <span className="ml-2 text-xs text-muted-foreground print:text-black/60">
                              {cuandoFue(n.fecha, fecha)}
                            </span>
                          </td>
                          <td className="w-20 px-2 py-1.5 text-right text-base font-bold tabular-nums">
                            {n.cantidad}
                          </td>
                          <td className="w-20 px-2 py-1.5 text-center">☐</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Firmas />
          </article>
        );
      })}
    </section>
  );
}

function nombre(p: ProductoSugerido) {
  return `${p.nombre}${p.tamano ? ` · ${p.tamano}` : ""}`;
}

function Encabezado({ fecha, hoy }: { fecha: string; hoy: string }) {
  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Hoja de cada tienda</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatoLargo(fecha)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/hoy"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Hoy
          </Link>
          <BotonImprimir texto="Imprimir hojas de tiendas" />
        </div>
      </div>
      <ElegirDia fecha={fecha} hoy={hoy} ruta="/cuadros/despacho" />
      <p className="text-sm text-muted-foreground">
        Una hoja por tienda, para tachar lo que se manda. Cada una sale en su
        propia página. El cuadro completo (como el Excel) se imprime desde
        Cuadros.
      </p>
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
