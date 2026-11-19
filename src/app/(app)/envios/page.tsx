import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, formatoLargo } from "@/lib/fechas";
import { cargarSugeridosDelDia, type SugeridosDelDia } from "@/lib/sugeridos";
import { aMandar } from "@/lib/hoja-completa";
import { ordenarProductos } from "@/lib/orden-productos";
import { diaProduccionAnterior, type NoEnviado } from "@/lib/no-enviados";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import { EnviosCliente, type TiendaEnvio } from "./envios-cliente";

export const dynamic = "force-dynamic";

export default async function EnviosPage() {
  const supabase = await createClient();
  const fecha = hoyTegucigalpa();
  // Lo que no salió el día con producción anterior se suma hoy (19 nov).
  const anterior = diaProduccionAnterior(fecha);

  let dia: SugeridosDelDia;
  let registros: NoEnviado[];
  try {
    const [diaCargado, registrosRes] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      // Los de hoy y los del día anterior (que se suman hoy).
      supabase
        .from("no_enviados")
        .select("id, fecha, sucursal_id, producto_id, cantidad, enviado_at")
        .in("fecha", [fecha, anterior]),
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
  // (su pedido + lo que no salió ayer, o el ajuste del admin).
  const productos = ordenarProductos(dia.productos);
  const tiendas: TiendaEnvio[] = dia.sucursales
    .filter((s) => s.id !== dia.principalId)
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      filas: productos
        .map((p) => {
          const { mandar, arrastre } = aMandar(dia, `${p.id}-${s.id}`);
          return { productoId: p.id, mandar: mandar ?? 0, arrastre };
        })
        .filter((f) => f.mandar > 0),
    }));

  const nombres = Object.fromEntries(
    dia.productos.map((p) => [p.id, `${p.nombre}${p.tamano ? ` · ${p.tamano}` : ""}`])
  );

  return (
    <EnviosCliente
      fecha={fecha}
      anterior={anterior}
      fechaLegible={formatoLargo(fecha)}
      tiendas={tiendas}
      nombres={nombres}
      nombresTienda={Object.fromEntries(dia.sucursales.map((s) => [s.id, s.nombre]))}
      registrosIniciales={registros}
    />
  );
}
