"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ChipColorDia } from "@/components/color-dia";
import { Printer, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  COLUMNAS_ASIGNACION,
  TANDAS,
  aAsignacion,
  horaCorta,
  idsAreasEnEquipo,
  nombreProducto,
  type AsignacionDia,
  type DatosReparto,
  type PasteleraDia,
  type PlanDia,
  type TotalesCuadro,
} from "@/lib/asignaciones";
import {
  claveCelda,
  construirSecciones,
  type SeccionReparto,
} from "@/lib/secciones-reparto";
import { sumaPorcentajesPorArea } from "@/lib/reparto";
import {
  librasPorBatida,
  MAX_LIBRAS_BATIDA,
  type BatidasMasa,
} from "@/lib/batidas";
import {
  generarRepartoDelDia,
  type ResultadoAccion,
} from "@/lib/acciones/reparto";

type Props = {
  fecha: string;
  fechaLegible: string;
  datos: DatosReparto;
  totalesCuadro: TotalesCuadro;
  sucursalesPendientes: number;
};

type EstadoDia = { plan: PlanDia; asignaciones: AsignacionDia[] };

export function AsignarCliente({
  fecha,
  fechaLegible,
  datos,
  totalesCuadro,
  sucursalesPendientes,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const clave = useMemo(() => ["reparto", fecha], [fecha]);
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [confirmarGenerar, setConfirmarGenerar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [errorCelda, setErrorCelda] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: clave,
    queryFn: async (): Promise<EstadoDia> => {
      const [planRes, asigRes] = await Promise.all([
        supabase
          .from("planes_dia")
          .select("estado, generado_at, publicado_at")
          .eq("fecha", fecha)
          .maybeSingle(),
        supabase
          .from("asignaciones")
          .select(COLUMNAS_ASIGNACION)
          .eq("fecha", fecha),
      ]);
      if (planRes.error) throw new Error(planRes.error.message);
      if (asigRes.error) throw new Error(asigRes.error.message);
      return {
        plan: planRes.data
          ? {
              estado:
                planRes.data.estado === "publicado" ? "publicado" : "borrador",
              generado_at: planRes.data.generado_at,
              publicado_at: planRes.data.publicado_at,
            }
          : null,
        asignaciones: (asigRes.data ?? []).map(aAsignacion),
      };
    },
    initialData: { plan: datos.plan, asignaciones: datos.asignaciones },
    refetchInterval: 60_000,
  });

  const { plan, asignaciones } = data;

  const porCelda = useMemo(() => {
    const mapa = new Map<string, AsignacionDia>();
    for (const a of asignaciones) {
      mapa.set(claveCelda(a.producto_id, a.pastelera_id, a.tipo, a.tanda), a);
    }
    return mapa;
  }, [asignaciones]);

  // Libras por batida de cada masa con lo que hay en las casillas.
  const batidas = useMemo(
    () =>
      librasPorBatida(
        asignaciones,
        datos.productos.map((p) => ({ ...p, libras: p.libras ?? null }))
      ),
    [asignaciones, datos.productos]
  );

  const secciones = useMemo(
    () =>
      construirSecciones({
        areas: datos.areas,
        pasteleras: datos.pasteleras,
        productos: datos.productos,
        asignaciones,
      }),
    [datos, asignaciones]
  );

  const areasEnEquipo = useMemo(() => idsAreasEnEquipo(datos.areas), [datos.areas]);
  const sumas = useMemo(
    () => sumaPorcentajesPorArea(datos.pasteleras, areasEnEquipo),
    [datos.pasteleras, areasEnEquipo]
  );
  const areasDescuadradas = datos.areas.filter((a) => {
    if (!a.activa || areasEnEquipo.has(a.id)) return false;
    const suma = sumas.get(a.id);
    if (suma === undefined) return !a.es_decoracion;
    return Math.abs(suma - 100) > 0.01;
  });
  const sinAsignar = asignaciones.filter((a) => a.pastelera_id === null);

  const guardarCelda = useMutation({
    mutationFn: async (vars: {
      productoId: number;
      pasteleraId: number | null;
      tipo: AsignacionDia["tipo"];
      tanda: number;
      cantidad: number;
      existente: AsignacionDia | undefined;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (vars.cantidad === 0) {
        if (!vars.existente) return;
        const { error } = await supabase
          .from("asignaciones")
          .delete()
          .eq("id", vars.existente.id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("asignaciones").upsert(
        {
          fecha,
          producto_id: vars.productoId,
          pastelera_id: vars.pasteleraId,
          tipo: vars.tipo,
          tanda: vars.tanda,
          cantidad: vars.cantidad,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "fecha,producto_id,pastelera_id,tipo,tanda" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setErrorCelda(null);
      void queryClient.invalidateQueries({ queryKey: ["reparto", fecha] });
    },
    onError: () =>
      setErrorCelda(
        "No se pudo guardar el cambio. Revisá que haya internet e intentá de nuevo."
      ),
  });

  const confirmarCelda = (
    seccion: SeccionReparto,
    productoId: number,
    pasteleraId: number | null,
    tanda: number
  ) => {
    const k = claveCelda(productoId, pasteleraId, seccion.tipo, tanda);
    const texto = borradores[k];
    setBorradores((prev) => {
      const { [k]: _quitado, ...resto } = prev;
      void _quitado;
      return resto;
    });
    if (texto === undefined) return;
    const cantidad = texto.trim() === "" ? 0 : parseInt(texto, 10);
    if (!Number.isFinite(cantidad) || cantidad < 0) return;
    const existente = porCelda.get(k);
    if ((existente?.cantidad ?? 0) === cantidad) return;
    guardarCelda.mutate({
      productoId,
      pasteleraId,
      tipo: seccion.tipo,
      tanda,
      cantidad,
      existente,
    });
  };

  const ejecutar = (accion: () => Promise<ResultadoAccion>) => {
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado);
      await queryClient.invalidateQueries({ queryKey: ["reparto", fecha] });
      router.refresh();
    });
  };

  const estadoPlan = !plan
    ? { texto: "Todavía no se hace", clase: "bg-muted text-muted-foreground" }
    : {
        texto: `Hecho${plan.generado_at ? ` a las ${horaCorta(plan.generado_at)}` : ""}`,
        clase: "bg-exito/10 text-exito",
      };

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoSeccion
        grupo={GRUPO_HOY}
        actual="reparto"
        detalle={
          <>
            <span className="first-letter:uppercase">{fechaLegible}</span>
            <ChipColorDia fecha={fecha} />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoPlan.clase}`}>
              {estadoPlan.texto}
            </span>
          </>
        }
      >
        <Button
          variant={asignaciones.length > 0 ? "outline" : "default"}
          size="lg"
          disabled={pendiente}
          onClick={() =>
            asignaciones.length > 0
              ? setConfirmarGenerar(true)
              : ejecutar(generarRepartoDelDia)
          }
        >
          <WandSparkles />
          {asignaciones.length > 0 ? "Hacer de nuevo" : "Hacer el reparto"}
        </Button>
        {asignaciones.length > 0 && (
          <Button asChild size="lg">
            <Link href="/asignar/imprimir">
              <Printer />
              Imprimir hojas
            </Link>
          </Button>
        )}
      </EncabezadoSeccion>

      {aviso && <Aviso tipo={aviso.ok ? "exito" : "error"}>{aviso.mensaje}</Aviso>}
      {errorCelda && <Aviso tipo="error">{errorCelda}</Aviso>}
      {sucursalesPendientes > 0 && (
        <Aviso tipo="aviso">
          {sucursalesPendientes === 1
            ? "1 tienda todavía no termina su inventario"
            : `${sucursalesPendientes} tiendas todavía no terminan su inventario`}
          : si hacés el reparto ahora, sus números pueden cambiar después.
        </Aviso>
      )}
      {areasDescuadradas.length > 0 && (
        <Aviso tipo="aviso">
          Los porcentajes de estas áreas no suman 100 %:{" "}
          {areasDescuadradas
            .map((a) => `${a.nombre} (${sumas.get(a.id) ?? 0} %)`)
            .join(", ")}
          .{" "}
          <Link href="/pasteleras" className="font-semibold underline">
            Arreglarlo en Pasteleras
          </Link>
        </Aviso>
      )}
      {sinAsignar.length > 0 && (
        <Aviso tipo="aviso">
          Hay {sinAsignar.length} trabajos sin pastelera (en la columna
          &quot;Sin asignar&quot;). Escribí las cantidades en la columna de una
          pastelera, o asigná pasteleras a esa área en Pasteleras.
        </Aviso>
      )}

      {asignaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay reparto para hoy. Tocá{" "}
          <span className="font-semibold">Hacer el reparto</span>: el total de
          cada producto del cuadro se divide solo entre las pasteleras de su
          área, según su porcentaje. Después podés cambiar cualquier número.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Cómo leer la tabla:</span>{" "}
              cada pastelera tiene 4 casillas, una por tanda (T1 = primera
              tanda, T2 = segunda…). Todo empieza en la primera tanda; si
              querés que haga una parte más tarde, pasá ese número a otra
              casilla. Los cambios se guardan solos.
            </p>
            <p className="mt-1">
              Si la columna <span className="font-semibold">Asignado</span>{" "}
              muestra ⚠, lo repartido no coincide con el total del cuadro.
            </p>
            <p className="mt-1">
              Cuando esté bien, tocá{" "}
              <span className="font-semibold text-foreground">Imprimir hojas</span>{" "}
              y entregale a cada pastelera la suya.
            </p>
          </div>
          {batidas.length > 0 && <PanelBatidas batidas={batidas} />}
          {secciones.map((seccion) => (
            <TablaSeccion
              key={seccion.clave}
              seccion={seccion}
              porCelda={porCelda}
              borradores={borradores}
              setBorrador={(k, v) => setBorradores((prev) => ({ ...prev, [k]: v }))}
              confirmar={confirmarCelda}
              totalesCuadro={totalesCuadro}
            />
          ))}
        </>
      )}

      <Dialog open={confirmarGenerar} onOpenChange={setConfirmarGenerar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Hacer el reparto de nuevo?</DialogTitle>
            <DialogDescription>
              Se vuelve a repartir todo con los números actuales del cuadro. Los
              cambios que hiciste a mano se pierden. Si ya imprimiste las
              hojas, imprimilas de nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmarGenerar(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pendiente}
              onClick={() => {
                setConfirmarGenerar(false);
                ejecutar(generarRepartoDelDia);
              }}
            >
              Sí, hacerlo de nuevo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Libras de cada batida (tanda) por masa; en rojo, las que pasan de 100 lb. */
function PanelBatidas({ batidas }: { batidas: BatidasMasa[] }) {
  const excedidas = batidas.filter((b) => b.excedidas.length > 0);
  return (
    <article className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-bold">Libras por batida</h2>
        <p className="text-xs text-muted-foreground">
          Lo que se hornea en cada tanda × las libras de cada tamaño. Máximo{" "}
          {MAX_LIBRAS_BATIDA} lb por batida.
        </p>
      </header>
      {excedidas.length > 0 && (
        <p className="border-b px-3 py-2 text-sm font-medium text-destructive">
          Se pasa de {MAX_LIBRAS_BATIDA} lb:{" "}
          {excedidas
            .map((b) => `${b.masa} en ${b.excedidas.map((t) => `T${t}`).join(", ")}`)
            .join(" · ")}
          . Pasá parte a otra tanda.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-1.5 text-left font-semibold">Masa</th>
              {[1, 2, 3, 4].map((t) => (
                <th key={t} className="px-2 py-1.5 text-right font-semibold">
                  T{t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batidas.map((b) => (
              <tr key={b.masa} className="border-b last:border-b-0">
                <td className="px-3 py-1 font-medium">{b.masa}</td>
                {b.libras.map((l, i) => {
                  const pasa = b.excedidas.includes(i + 1);
                  return (
                    <td
                      key={i}
                      className={`px-2 py-1 text-right tabular-nums ${
                        pasa ? "font-bold text-destructive" : l === 0 ? "text-muted-foreground" : ""
                      }`}
                    >
                      {l === 0 ? "—" : `${Math.round(l * 10) / 10} lb`}
                      {pasa ? " ⚠" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TablaSeccion({
  seccion,
  porCelda,
  borradores,
  setBorrador,
  confirmar,
  totalesCuadro,
}: {
  seccion: SeccionReparto;
  porCelda: Map<string, AsignacionDia>;
  borradores: Record<string, string>;
  setBorrador: (clave: string, valor: string) => void;
  confirmar: (
    seccion: SeccionReparto,
    productoId: number,
    pasteleraId: number | null,
    tanda: number
  ) => void;
  totalesCuadro: TotalesCuadro;
}) {
  const nombreColumna = (p: PasteleraDia | null) =>
    p
      ? `${seccion.equipo ?? p.nombre}${p.activa ? "" : " (inactiva)"}`
      : "Sin asignar";

  return (
    <article className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-bold">{seccion.titulo}</h2>
        <p className="text-xs text-muted-foreground">
          {seccion.equipo
            ? `En equipo: ${seccion.equipo} (una sola hoja, sin dividir)`
            : seccion.columnas
                .filter((c): c is PasteleraDia => c !== null)
                .map((c) => `${c.nombre} ${c.porcentaje} %`)
                .join(" · ") || "Sin pasteleras configuradas"}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th rowSpan={2} className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-semibold">
                Producto
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1.5 text-right font-semibold"
                title={
                  seccion.tipo === "decoracion"
                    ? "Total a decorar del cuadro (suma de sugeridos)"
                    : "A hornear según el cuadro (suma de sugeridos − sin decorar)"
                }
              >
                Cuadro
              </th>
              <th rowSpan={2} className="px-2 py-1.5 text-right font-semibold">
                Asignado
              </th>
              {seccion.columnas.map((c) => (
                <th
                  key={c?.id ?? "x"}
                  colSpan={TANDAS.length}
                  className="border-l px-2 py-1 text-center font-semibold"
                >
                  {nombreColumna(c)}
                </th>
              ))}
            </tr>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {seccion.columnas.map((c) =>
                TANDAS.map((t) => (
                  <th
                    key={`${c?.id ?? "x"}-${t}`}
                    className={`px-1 py-0.5 text-center font-medium ${t === 1 ? "border-l" : ""}`}
                  >
                    T{t}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {seccion.productos.map((p) => {
              let asignado = 0;
              for (const c of seccion.columnas) {
                for (const t of TANDAS) {
                  asignado +=
                    porCelda.get(claveCelda(p.id, c?.id ?? null, seccion.tipo, t))
                      ?.cantidad ?? 0;
                }
              }
              const delCuadro = totalesCuadro[p.id];
              const cuadro =
                (seccion.tipo === "decoracion"
                  ? delCuadro?.decoracion
                  : delCuadro?.produccion) ?? 0;
              const sinDecorar =
                seccion.tipo === "produccion" ? (delCuadro?.sinDecorar ?? 0) : 0;
              const descuadre = asignado !== cuadro;
              return (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1 font-medium">
                    {nombreProducto(p)}
                  </td>
                  <td
                    className="px-2 py-1 text-right tabular-nums text-muted-foreground"
                    title={
                      sinDecorar > 0
                        ? `Ya hay ${sinDecorar} sin decorar en Principal: no se hornean de nuevo`
                        : undefined
                    }
                  >
                    {cuadro}
                    {sinDecorar > 0 && (
                      <div className="text-[10px] leading-tight">
                        −{sinDecorar} sin decorar
                      </div>
                    )}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-semibold tabular-nums ${
                      descuadre ? "text-aviso" : ""
                    }`}
                    title={descuadre ? "No coincide con el total del cuadro" : undefined}
                  >
                    {asignado}
                    {descuadre ? " ⚠" : ""}
                  </td>
                  {seccion.columnas.map((c) =>
                    TANDAS.map((t) => {
                      const k = claveCelda(p.id, c?.id ?? null, seccion.tipo, t);
                      const asig = porCelda.get(k);
                      const valor =
                        borradores[k] ?? (asig && asig.cantidad > 0 ? String(asig.cantidad) : "");
                      return (
                        <td
                          key={`${c?.id ?? "x"}-${t}`}
                          className={`px-0.5 py-0.5 text-center ${t === 1 ? "border-l" : ""}`}
                        >
                          <input
                            inputMode="numeric"
                            value={valor}
                            onChange={(e) =>
                              setBorrador(k, e.target.value.replace(/\D/g, "").slice(0, 4))
                            }
                            onBlur={() => confirmar(seccion, p.id, c?.id ?? null, t)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className={`h-8 w-11 rounded border bg-background text-center tabular-nums outline-none focus:ring-2 focus:ring-ring/50 ${
                              asig && asig.cantidad > 0 ? "font-semibold" : "text-muted-foreground"
                            }`}
                            aria-label={`${nombreProducto(p)} · ${nombreColumna(c)} · tanda ${t}`}
                          />
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
