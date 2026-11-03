import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { cargarSugeridosDelDia, type SugeridosDelDia } from "@/lib/sugeridos";
import { aMandar } from "@/lib/hoja-completa";
import { ordenarProductos } from "@/lib/orden-productos";
import { DIAS_PENDIENTES, type NoEnviado } from "@/lib/no-enviados";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import { EnviosCliente, type TiendaEnvio } from "./envios-cliente";

export const dynamic = "force-dynamic";

export default async function EnviosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  const desde = new Date(`${fecha}T12:00:00Z`);
  desde.setUTCDate(desde.getUTCDate() - DIAS_PENDIENTES);
  const desdeIso = desde.toISOString().slice(0, 10);

  let dia: SugeridosDelDia;
  let registros: NoEnviado[];
  try {
    const [diaCargado, registrosRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      // Los de hoy (mandados o no) y lo que sigue pendiente de días atrás.
      supabase
        .from("no_enviados")
        .select("id, fecha, sucursal_id, producto_id, cantidad, enviado_at")
        .or(`fecha.eq.${fecha},and(enviado_at.is.null,fecha.gte.${desdeIso})`),
    ]);
    if (registrosRes.error) throw new Error(registrosRes.error.message);
    dia = diaCargado;
    registros = registrosRes.data;
  } catch {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="envios" />
        <Aviso tipo="error">
          No se pudo cargar. Revisá que haya internet y recargá la página.
        </Aviso>
      </section>
    );
  }

  // Lo que se le manda hoy a cada tienda: igual que la hoja de despacho
  // (su pedido o el ajuste del admin en el cuadro completo).
  const productos = ordenarProductos(dia.productos);
  const tiendas: TiendaEnvio[] = dia.sucursales
    .filter((s) => s.id !== dia.principalId)
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      filas: productos
        .map((p) => ({
          productoId: p.id,
          mandar: aMandar(dia, `${p.id}-${s.id}`).mandar ?? 0,
        }))
        .filter((f) => f.mandar > 0),
    }));

  const nombres = Object.fromEntries(
    dia.productos.map((p) => [p.id, `${p.nombre}${p.tamano ? ` · ${p.tamano}` : ""}`])
  );

  return (
    <EnviosCliente
      fecha={fecha}
      fechaLegible={formatoLargo(fecha)}
      tiendas={tiendas}
      nombres={nombres}
      nombresTienda={Object.fromEntries(dia.sucursales.map((s) => [s.id, s.nombre]))}
      registrosIniciales={registros}
    />
  );
}
