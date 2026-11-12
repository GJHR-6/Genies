import { createClient } from "@/lib/supabase/server";
import { hoyTegucigalpa, fechaElegida, formatoLargo } from "@/lib/fechas";
import { ElegirDia } from "@/components/elegir-dia";
import {
  cargarSugeridosDelDia,
  diaSemana,
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
import { MAX_BATIDAS, batidasDelCuadro } from "@/lib/batidas";
import type { DatosBatidas } from "./hoja-cuadro";
import { CuadroCompleto, cargarDatosBatidas } from "./cuadro-completo";

export const dynamic = "force-dynamic";

type Cuadro = {
  titulo: string;
  encargadas: string | null;
  /** Productos del cuadro con lo de hoy (PROD o DEC; 0 = nada) y sus batidas. */
  filas: { producto: ProductoSugerido; cantidad: number; batidas: readonly number[] }[];
};

/** Columnas de la semana, como la hoja de papel (1 = lunes … 6 = sábado). */
const DIAS_SEMANA = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
] as const;
/** Renglones vacíos al final, para anotar a mano. */
const RENGLONES_EXTRA = 2;

export default async function CuadrosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const supabase = await createClient();
  // Hoy, o un día anterior para revisarlo o reimprimirlo (?fecha=).
  const hoy = hoyTegucigalpa();
  const fecha = fechaElegida((await searchParams).fecha, hoy);
  const color = colorDelDia(fecha);

  // Domingo: no hay producción, no se generan cuadros.
  if (!color) {
    return (
      <section className="flex flex-col gap-4">
        <EncabezadoSeccion grupo={GRUPO_HOY} actual="cuadros" />
        <ElegirDia fecha={fecha} hoy={hoy} ruta="/cuadros" />
        <Aviso tipo="info">
          Ese día es domingo: no hay producción. Los cuadros salen de lunes a
          sábado.
        </Aviso>
      </section>
    );
  }

  let dia: SugeridosDelDia;
  let areas: { id: number; nombre: string; encargadas: string }[];
  let areaDecoracionId: number | null = null;
  let cerradas = 0;
  let batidas: DatosBatidas;
  try {
    const [diaCargado, areasRes, cierresRes, batidasCargadas] = await Promise.all([
      cargarSugeridosDelDia(supabase, fecha),
      supabase
        .from("areas_produccion")
        .select("id, nombre, encargadas, es_decoracion, pasteleras(nombre, activa, orden)")
        .eq("activa", true)
        .order("orden"),
      supabase
        .from("cierres_dia")
        .select("estado")
        .eq("fecha", fecha)
        .eq("estado", "cerrado"),
      cargarDatosBatidas(supabase, fecha),
    ]);
    if (areasRes.error) throw new Error(areasRes.error.message);
    if (cierresRes.error) throw new Error(cierresRes.error.message);
    dia = diaCargado;
    batidas = batidasCargadas;
    // Encargadas = pasteleras activas del área (si no hay, el texto original).
    // El área Decoración no tiene cuadro de producción: sus productos solo
    // se decoran (salen en el cuadro de Decoración).
    areaDecoracionId = areasRes.data.find((a) => a.es_decoracion)?.id ?? null;
    areas = areasRes.data.filter((a) => !a.es_decoracion).map((a) => {
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

  // Solo para avisar si todavía no hay objetivos cargados.
  const conRegla = productos.filter((p) =>
    sucursales.some((s) => celdas[`${p.id}-${s.id}`] !== undefined)
  );
  // Primero el cuadro completo (HojaCuadro): todos los productos en el
  // orden del Excel, como INVENTARIO DIARIO, para llenar y revisar el
  // SALDO. Después, uno por área.
  const ordenExcel = [...productos].sort(compararProductos);

  // Cuadros por área (3 nov 2026), como la hoja de papel de las pasteleras:
  // MÍNIMO (objetivo de Principal) · PRODUCTO · lunes a sábado con PROD.
  // para llenar a mano (el SALDO solo va en Decoración: 10 nov). En el día de hoy, PROD. ya trae lo que se
  // manda a hacer = suma del PROD de las batidas del cuadro completo
  // (reparto + lo cambiado a mano); en Decoración, la suma del DEC.
  const efectivas = batidasDelCuadro({
    productos,
    prodReparto: new Map(
      Object.entries(batidas.prodReparto).map(([id, fila]) => [Number(id), fila])
    ),
    sinDecorar: dia.sinDecorar,
    ajustes: batidas.ajustes,
  });
  const suma = (fila: readonly number[] | undefined) =>
    (fila ?? []).reduce((t, c) => t + c, 0);
  const filasDe = (
    lista: ProductoSugerido[],
    porProducto: ReadonlyMap<number, readonly number[]>,
    soloConCantidad = false
  ) =>
    lista
      .map((producto) => ({
        producto,
        cantidad: suma(porProducto.get(producto.id)),
        batidas: porProducto.get(producto.id) ?? [],
      }))
      .filter((f) => !soloConCantidad || f.cantidad > 0);
  const minimoDe = (id: number) =>
    dia.principalId === null ? null : (celdas[`${id}-${dia.principalId}`]?.objetivo ?? null);
  const hoySemana = diaSemana(fecha);

  const cuadros: Cuadro[] = areas.map((a) => ({
    titulo: a.nombre,
    encargadas: a.encargadas,
    filas: filasDe(
      ordenExcel.filter((p) => p.area_id === a.id),
      efectivas.prod
    ),
  }));

  // Decoración no es un área: los productos que llevan decoración y lo que
  // haya en DEC.
  cuadros.push({
    titulo: "Decoración",
    encargadas: null,
    filas: filasDe(ordenExcel, efectivas.dec).filter(
      (f) => f.producto.lleva_decoracion || f.cantidad > 0
    ),
  });

  // Incluye los de un área desactivada en Catálogos, para que no se pierdan.
  const idsPorArea = new Set(areas.map((a) => a.id));
  cuadros.push({
    titulo: "Sin área asignada",
    encargadas: null,
    filas: filasDe(
      ordenExcel.filter(
        (p) => (p.area_id === null || !idsPorArea.has(p.area_id)) && p.area_id !== areaDecoracionId
      ),
      efectivas.prod,
      true
    ),
  });
  const conTrabajo = cuadros.filter((c) => c.filas.length > 0);
  const hayBatidas = efectivas.prod.size > 0;

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
          <Link href={fecha === hoy ? "/cuadros/despacho" : `/cuadros/despacho?fecha=${fecha}`}>
            <Truck />
            Hojas de despacho
          </Link>
        </Button>
        <BotonImprimir />
      </EncabezadoSeccion>

      <ElegirDia fecha={fecha} hoy={hoy} ruta="/cuadros" />
      {fecha !== hoy && (
        <Aviso tipo="info" className="print:hidden">
          Estás viendo un día anterior. Lo que cambies acá se guarda en ese día.
        </Aviso>
      )}

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

      <CuadroCompleto fecha={fecha} dia={dia} batidas={batidas} />

      {!hayBatidas && (
        <Aviso tipo="info" className="print:hidden">
          Los cuadros de cada área salen con lo que se manda a producir (PROD
          de las batidas). Todavía no hay nada: hacé el reparto o escribí PROD
          en el cuadro completo.{" "}
          <Link href="/asignar" className="font-semibold underline">
            Hacer el reparto
          </Link>
        </Aviso>
      )}

      {conTrabajo.map((cuadro) => {
        const esDecoracion = cuadro.titulo === "Decoración";
        // Secciones (VAINILLA, CHOCOLATE…) en el orden del Excel.
        const secciones: { nombre: string; filas: Cuadro["filas"] }[] = [];
        for (const f of cuadro.filas) {
          const nombre = f.producto.categoria ?? "OTROS";
          const ultima = secciones[secciones.length - 1];
          if (ultima?.nombre === nombre) ultima.filas.push(f);
          else secciones.push({ nombre, filas: [f] });
        }
        const borde = "border border-border print:border-black";
        const hoyClase = "bg-primary/10 print:bg-black/10";
        // Una casilla por batida (12 nov), tantas como se usan hoy en el
        // cuadro (mínimo 2): PROD en producción, DEC en decoración, que
        // además lleva SALDO al final de cada día.
        const usadas = Math.max(
          0,
          ...cuadro.filas.map((f) => {
            let ultima = 0;
            f.batidas.forEach((c, i) => {
              if (c > 0) ultima = i + 1;
            });
            return ultima;
          })
        );
        const numBatidas = Math.min(Math.max(usadas, 2), MAX_BATIDAS);
        const porDia = esDecoracion ? numBatidas + 1 : numBatidas;
        const sumaBatidas = (filas: Cuadro["filas"]) =>
          Array.from({ length: MAX_BATIDAS }, (_, i) =>
            filas.reduce((t, f) => t + (f.batidas[i] ?? 0), 0)
          );
        // Lo que va hoy en las casillas del día.
        const deHoy = (batidas: readonly number[]): React.ReactNode[] =>
          // La casilla SALDO (decoración) se llena a mano.
          [...Array.from({ length: numBatidas }, (_, i) => batidas[i] || ""), ...(esDecoracion ? [null] : [])];
        const celdasDias = (hoy: React.ReactNode[] | null, clase = "") =>
          DIAS_SEMANA.map(([n]) => (
            <Fragment key={n}>
              {Array.from({ length: porDia }, (_, i) => (
                <td
                  key={i}
                  className={`${borde} h-8 w-10 px-1 text-right tabular-nums ${n === hoySemana ? `${hoyClase} ${clase}` : ""}`}
                >
                  {n === hoySemana && hoy ? hoy[i] : null}
                </td>
              ))}
            </Fragment>
          ));
        return (
        <article
          key={cuadro.titulo}
          className="break-after-page rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0 print:[page:horizontal]"
        >
          <header className="mb-3 flex items-baseline justify-between gap-2 border-b pb-2 print:border-black">
            <h2 className="text-lg font-bold">
              {esDecoracion
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
          <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:text-xs">
            <thead>
              <tr>
                <th rowSpan={2} className={`${borde} w-16 px-1 py-1 text-center font-semibold uppercase`}>
                  Mínimo
                </th>
                <th rowSpan={2} className={`${borde} px-2 py-1 text-left font-semibold uppercase`}>
                  Producto
                </th>
                {DIAS_SEMANA.map(([n, nombre]) => (
                  <th
                    key={n}
                    colSpan={porDia}
                    className={`${borde} px-1 py-1 text-center font-semibold uppercase ${n === hoySemana ? hoyClase : ""}`}
                  >
                    {nombre}
                    {n === hoySemana && <span className="sr-only"> (hoy)</span>}
                  </th>
                ))}
              </tr>
              <tr>
                {DIAS_SEMANA.map(([n]) => (
                  <Fragment key={n}>
                    {[
                      ...Array.from({ length: numBatidas }, (_, i) => `B${i + 1}`),
                      ...(esDecoracion ? ["SALDO"] : []),
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        title={titulo.startsWith("B") ? `Batida ${titulo.slice(1)}` : undefined}
                        className={`${borde} px-1 py-0.5 text-center text-[11px] font-semibold ${n === hoySemana ? hoyClase : ""}`}
                      >
                        {titulo}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {secciones.map((seccion) => (
                <Fragment key={seccion.nombre}>
                  <tr className="bg-muted/50 print:bg-black/10">
                    <td colSpan={2 + DIAS_SEMANA.length * porDia} className={`${borde} py-0.5 px-2 text-xs font-bold uppercase tracking-wide`}>
                      {seccion.nombre}
                    </td>
                  </tr>
                  {seccion.filas.map(({ producto: p, batidas }) => (
                    <tr key={p.id}>
                      <td className={`${borde} px-1 text-right tabular-nums`}>
                        {minimoDe(p.id) || ""}
                      </td>
                      <td className={`${borde} px-2 font-medium`}>
                        {p.nombre}
                        {p.tamano ? ` · ${p.tamano}` : ""}
                      </td>
                      {celdasDias(deHoy(batidas), "text-base font-bold whitespace-nowrap")}
                    </tr>
                  ))}
                  {secciones.length > 1 && seccion.filas.length > 1 && (
                    <tr>
                      <td className={borde} />
                      <td className={`${borde} px-2 text-xs font-semibold first-letter:uppercase`}>
                        Total {seccion.nombre.toLowerCase()}
                      </td>
                      {celdasDias(
                        deHoy(sumaBatidas(seccion.filas)),
                        "font-semibold whitespace-nowrap"
                      )}
                    </tr>
                  )}
                </Fragment>
              ))}
              {Array.from({ length: RENGLONES_EXTRA }, (_, i) => (
                <tr key={`extra-${i}`}>
                  <td className={`${borde} h-8`} />
                  <td className={borde} />
                  {celdasDias(null)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className={borde} />
                <td className={`${borde} px-2 py-1`}>Total</td>
                {celdasDias(
                  deHoy(sumaBatidas(cuadro.filas)),
                  "text-base whitespace-nowrap"
                )}
              </tr>
            </tfoot>
          </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground print:text-black/60">
            Mínimo = lo que Principal debe tener. Hoy ({color.nombre.toLowerCase()})
            ya trae lo que hay que {esDecoracion ? "decorar" : "producir"}
, en una casilla por batida (B1, B2…){esDecoracion ? " y el SALDO al final" : ""};
            los demás días se llenan a mano.
          </p>
        </article>
        );
      })}
    </section>
  );
}
