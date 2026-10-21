import { compararProductos } from "@/lib/orden-productos";
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
    .select("id, nombre, es_principal")
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
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tu usuario no tiene sucursal asignada.
        </p>
      </section>
    );
  }

  const [movimientosRes, extrasRes, cierreRes] = await Promise.all([
    supabase
      .from("v_movimientos")
      .select(
        "producto_id, saldo_inicial, ingreso, devolucion, pedido, vendido, saldo_final, productos(nombre, tamano, categoria, orden)"
      )
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId),
    // Cambio y Sin decorar no están en v_movimientos: se leen de la tabla.
    supabase
      .from("movimientos_diarios")
      .select("producto_id, cambio, sin_decorar")
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId),
    supabase
      .from("cierres_dia")
      .select("estado")
      .eq("fecha", fecha)
      .eq("sucursal_id", sucursalId)
      .maybeSingle(),
  ]);

  // Mismo orden que el Excel (productos.orden).
  const movimientos = (movimientosRes.data ?? []).sort((a, b) =>
    compararProductos(
      a.productos ?? { nombre: "" },
      b.productos ?? { nombre: "" }
    )
  );
  const extras = new Map(
    (extrasRes.data ?? []).map((e) => [e.producto_id, e])
  );
  const sucursal = sucursales?.find((s) => s.id === sucursalId);
  const sucursalNombre = sucursal?.nombre ?? "";
  // Principal anota Sin decorar; las tiendas anotan Cambio (CM del Excel).
  const esPrincipal = sucursal?.es_principal ?? false;
  const cerrado = cierreRes.data?.estado === "cerrado";

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Lo que se anotó en días anteriores. Elegí la fecha
          {esAdmin ? " y la tienda" : ""} y tocá Ver.
        </p>
        <p className="text-sm font-medium">
          {sucursalNombre} · <span className="first-letter:uppercase">{formatoLargo(fecha)}</span>
          {cerrado ? " · Terminado" : ""}
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
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-right">
                <th className="px-3 py-2 text-left font-semibold">Producto</th>
                <th className="px-3 py-2 font-semibold">Saldo inicial</th>
                <th className="px-3 py-2 font-semibold">Ingreso</th>
                <th className="px-3 py-2 font-semibold">Devolución</th>
                {esPrincipal ? (
                  <th className="px-3 py-2 font-semibold">Sin decorar</th>
                ) : (
                  <th className="px-3 py-2 font-semibold">Cambio</th>
                )}
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
                  <td className="px-3 py-1.5">
                    {m.producto_id != null
                      ? (esPrincipal
                          ? extras.get(m.producto_id)?.sin_decorar
                          : extras.get(m.producto_id)?.cambio) ?? 0
                      : 0}
                  </td>
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
