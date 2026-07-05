import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import {
  cargarSugeridosDelDia,
  type ProductoSugerido,
  type SugeridosDelDia,
} from "@/lib/sugeridos";
import { BotonImprimir } from "./boton-imprimir";

export const dynamic = "force-dynamic";

type Cuadro = {
  departamento: string;
  productos: ProductoSugerido[];
};

export default async function CuadrosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();

  let dia: SugeridosDelDia;
  let departamentos: { id: number; nombre: string }[];
  let cerradas = 0;
  try {
    const [diaCargado, departamentosRes, cierresRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("departamentos")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("cierres_dia")
        .select("estado")
        .eq("fecha", fecha)
        .eq("estado", "cerrado"),
    ]);
    if (departamentosRes.error) throw new Error(departamentosRes.error.message);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    dia = diaCargado;
    departamentos = departamentosRes.data;
    cerradas = (cierresRes.data ?? []).length;
  } catch {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Cuadros de producción</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página.
        </p>
      </section>
    );
  }

  const { productos, sucursales, celdas } = dia;
  const pendientes = sucursales.length - cerradas;

  // Un cuadro por departamento; solo productos con alguna regla de sugerido.
  const conRegla = productos.filter((p) =>
    sucursales.some((s) => celdas[`${p.id}-${s.id}`] !== undefined)
  );
  const cuadros: Cuadro[] = departamentos
    .map((d) => ({
      departamento: d.nombre,
      productos: conRegla.filter((p) => p.departamento_id === d.id),
    }))
    .filter((c) => c.productos.length > 0);
  const sinDepartamento = conRegla.filter((p) => p.departamento_id === null);
  if (sinDepartamento.length > 0) {
    cuadros.push({ departamento: "Sin departamento", productos: sinDepartamento });
  }

  const sugeridoDe = (productoId: number, sucursalId: number): number | null =>
    celdas[`${productoId}-${sucursalId}`]?.sugerido ?? null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">Cuadros de producción</h1>
          <p className="text-sm text-muted-foreground">{formatoLargo(fecha)}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sugeridos"
            className="text-sm font-medium text-[#1F4E79] underline-offset-4 hover:underline"
          >
            ← Sugeridos
          </Link>
          <BotonImprimir />
        </div>
      </div>

      {pendientes > 0 && (
        <p
          role="status"
          className="rounded-md bg-[#B45309]/10 px-3 py-2 text-sm font-medium text-[#B45309] print:hidden"
        >
          {pendientes === 1
            ? "1 sucursal aún no cierra el día"
            : `${pendientes} sucursales aún no cierran el día`}
          ; sus cantidades usan el objetivo o la captura parcial.
        </p>
      )}

      {cuadros.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No hay productos con reglas de sugerido. Cargá el catálogo y las
          reglas (hito M2).
        </p>
      )}

      {cuadros.map((cuadro) => (
        <article
          key={cuadro.departamento}
          className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0"
        >
          <header className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2 print:border-black">
            <h2 className="text-lg font-bold">
              Cuadro de producción — {cuadro.departamento}
            </h2>
            <p className="text-sm text-muted-foreground print:text-black">
              Genies · {formatoLargo(fecha)}
            </p>
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
                        <span className="ml-2 rounded border border-[#1F4E79] px-1 py-0.5 text-[10px] font-semibold uppercase text-[#1F4E79] print:border-black print:text-black">
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
            Los productos marcados con “Decorar” llevan decoración.
          </p>
        </article>
      ))}
    </section>
  );
}
