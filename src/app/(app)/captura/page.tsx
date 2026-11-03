import { obtenerPerfil } from "@/lib/supabase/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { DIAS_PENDIENTES } from "@/lib/no-enviados";
import { CapturaCliente } from "./captura-cliente";

export const dynamic = "force-dynamic";

export default async function CapturaPage() {
  const perfil = await obtenerPerfil();

  if (!perfil?.sucursalId) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Inventario de hoy</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Tu usuario no tiene sucursal asignada. Contactá a la administración.
        </p>
      </section>
    );
  }

  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  const sucursalId = perfil.sucursalId;

  const desde = new Date(`${fecha}T12:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - DIAS_PENDIENTES);

  const [productosRes, movimientosRes, previosRes, cierreRes, sucursalRes, noEnviadosRes] =
    await Promise.all([
      supabase
        .from("productos")
        .select("id, nombre, categoria, tamano, lleva_decoracion")
        .eq("activo", true)
        .order("orden", { nullsFirst: false })
        .order("categoria")
        .order("nombre")
        .order("tamano"),
      supabase
        .from("movimientos_diarios")
        .select(
          "producto_id, saldo_inicial, ingreso, devolucion, pedido, cambio, decorado, sin_decorar"
        )
        .eq("fecha", fecha)
        .eq("sucursal_id", sucursalId),
      // Saldo con el que arranca cada producto: lo calcula la base igual
      // que al guardar (último día anterior con fila, no "ayer" de calendario).
      supabase.rpc("saldos_anteriores", {
        p_fecha: fecha,
        p_sucursal: sucursalId,
      }),
      supabase
        .from("cierres_dia")
        .select("estado")
        .eq("fecha", fecha)
        .eq("sucursal_id", sucursalId)
        .maybeSingle(),
      supabase
        .from("sucursales")
        .select("es_principal")
        .eq("id", sucursalId)
        .single(),
      // Lo que Principal no le pudo mandar y sigue pendiente.
      supabase
        .from("no_enviados")
        .select("id, fecha, cantidad, productos(nombre, tamano)")
        .eq("sucursal_id", sucursalId)
        .is("enviado_at", null)
        .gte("fecha", desde.toISOString().slice(0, 10))
        .order("fecha"),
    ]);

  const error =
    productosRes.error ??
    movimientosRes.error ??
    previosRes.error ??
    cierreRes.error ??
    sucursalRes.error;
  if (error) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Inventario de hoy</h1>
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No se pudieron cargar los datos. Recargá la página; si el problema
          sigue, avisá a la administración.
        </p>
      </section>
    );
  }

  const saldosAnteriores: Record<number, number> = {};
  for (const m of previosRes.data ?? []) {
    saldosAnteriores[m.producto_id] = m.saldo;
  }

  return (
    <CapturaCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      sucursalId={sucursalId}
      sucursalNombre={perfil.sucursalNombre ?? ""}
      userId={perfil.userId}
      esPrincipal={sucursalRes.data?.es_principal ?? false}
      cerradoInicial={cierreRes.data?.estado === "cerrado"}
      productos={productosRes.data ?? []}
      movimientosIniciales={movimientosRes.data ?? []}
      saldosAnteriores={saldosAnteriores}
      // Si falla esta consulta, el inventario igual se puede anotar.
      noEnviados={(noEnviadosRes.data ?? []).map((n) => ({
        id: n.id,
        fecha: n.fecha,
        cantidad: n.cantidad,
        nombre: n.productos
          ? `${n.productos.nombre}${n.productos.tamano ? ` · ${n.productos.tamano}` : ""}`
          : "Producto",
      }))}
    />
  );
}
