import { obtenerPerfil } from "@/lib/supabase/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";

export const dynamic = "force-dynamic";

type Params = { fecha?: string; sucursal?: string };

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await obtenerPerfil();
  const params = await searchParams;

  if (!perfil) return null;

  const esAdmin = perfil.rol === "admin";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.fecha ?? "")
    ? (params.fecha as string)
    : hoyTegucigalpa();

  const supabase = await createClient();
  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("activa", true)
    .order("id");

  // La tienda solo ve su sucursal; el admin elige.
  const sucursalParam = parseInt(params.sucursal ?? "", 10);
  const sucursalId = esAdmin
    ? Number.isFinite(sucursalParam)
      ? sucursalParam
      : (sucursales?.[0]?.id ?? 1)
    : perfil.sucursalId;

  if (!sucursalId) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Historial</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tu usuario no tiene sucursal asignada.
        </p>
      </section>
    );
  }

  const [movimientosRes, cierreRes] = await Promise.all([
    supabase
      .from("v_movimientos")
      .select(
        "producto_id, saldo_inicial, ingreso, devolucion, pedido, vendido, saldo_final, productos(nombre, tamano, categoria)"
      )
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId),
    supabase
      .from("cierres_dia")
      .select("estado")
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId)
      .maybeSingle(),
  ]);

  const movimientos = (movimientosRes.data ?? []).sort((a, b) =>
    `${a.productos?.categoria ?? ""}${a.productos?.nombre ?? ""}`.localeCompare(
      `${b.productos?.categoria ?? ""}${b.productos?.nombre ?? ""}`,
      "es"
    )
  );
  const sucursalNombre =
    sucursales?.find((s) => s.id === sucursalId)?.nombre ?? "";
  const cerrado = cierreRes.data?.estado === "cerrado";

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">
          {sucursalNombre} · {formatoLargo(fecha)}
          {cerrado ? " · Día cerrado" : ""}
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
      >
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Fecha
          <input
            type="date"
            name="fecha"
            defaultValue={fecha}
            max={hoyTegucigalpa()}
            className="h-10 rounded-md border bg-background px-2 text-sm text-foreground"
          />
        </label>
        {esAdmin && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Sucursal
            <select
              name="sucursal"
              defaultValue={sucursalId}
              className="h-10 rounded-md border bg-background px-2 text-sm text-foreground"
            >
              {(sucursales ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          className="h-10 rounded-md bg-[#1F4E79] px-4 text-sm font-medium text-white hover:bg-[#1F4E79]/90"
        >
          Ver
        </button>
      </form>

      {movimientos.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sin registros para esa fecha.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-right">
                <th className="px-3 py-2 text-left font-semibold">Producto</th>
                <th className="px-3 py-2 font-semibold">Saldo inicial</th>
                <th className="px-3 py-2 font-semibold">Ingreso</th>
                <th className="px-3 py-2 font-semibold">Devolución</th>
                <th className="px-3 py-2 font-semibold">Vendido</th>
                <th className="px-3 py-2 font-semibold">Pedido</th>
                <th className="px-3 py-2 font-semibold">Saldo final</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr
                  key={m.producto_id}
                  className="border-b text-right tabular-nums last:border-b-0"
                >
                  <td className="px-3 py-1.5 text-left font-medium">
                    {m.productos?.nombre}
                    {m.productos?.tamano ? ` · ${m.productos.tamano}` : ""}
                  </td>
                  <td className="px-3 py-1.5">{m.saldo_inicial}</td>
                  <td className="px-3 py-1.5">{m.ingreso}</td>
                  <td className="px-3 py-1.5">{m.devolucion}</td>
                  <td className="px-3 py-1.5">{m.vendido}</td>
                  <td className="px-3 py-1.5">{m.pedido}</td>
                  <td className="px-3 py-1.5">{m.saldo_final ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
