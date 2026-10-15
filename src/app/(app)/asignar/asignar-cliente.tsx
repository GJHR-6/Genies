"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ChipColorDia } from "@/components/color-dia";
import { Button } from "@/components/ui/button";
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
  nombreProducto,
  type AsignacionDia,
  type DatosReparto,
  type PasteleraDia,
  type PlanDia,
} from "@/lib/asignaciones";
import {
  claveCelda,
  construirSecciones,
  type SeccionReparto,
} from "@/lib/secciones-reparto";
import { resumirAvance, sumaPorcentajesPorArea } from "@/lib/reparto";
import {
  cambiarEstadoReparto,
  generarRepartoDelDia,
  type ResultadoAccion,
} from "@/lib/acciones/reparto";

type Props = {
  fecha: string;
  fechaLegible: string;
  datos: DatosReparto;
  totalesCuadro: Record<number, number>;
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

  // Tiempo real: el avance de la cocina aparece al instante.
  useEffect(() => {
    const invalidar = () => {
      void queryClient.invalidateQueries({ queryKey: ["reparto", fecha] });
    };
    const canal = supabase
      .channel(`reparto-${fecha}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asignaciones", filter: `fecha=eq.${fecha}` },
        invalidar
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "planes_dia", filter: `fecha=eq.${fecha}` },
        invalidar
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, queryClient, fecha]);

  const { plan, asignaciones } = data;

  const porCelda = useMemo(() => {
    const mapa = new Map<string, AsignacionDia>();
    for (const a of asignaciones) {
      mapa.set(claveCelda(a.producto_id, a.pastelera_id, a.tipo, a.tanda), a);
    }
    return mapa;
  }, [asignaciones]);

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

  const sumas = useMemo(
    () => sumaPorcentajesPorArea(datos.pasteleras),
    [datos.pasteleras]
  );
  const areasDescuadradas = datos.areas.filter((a) => {
    if (!a.activa) return false;
    const suma = sumas.get(a.id);
    if (suma === undefined) return !a.es_decoracion;
    return Math.abs(suma - 100) > 0.01;
  });
  const sinAsignar = asignaciones.filter((a) => a.pastelera_id === null);
  const conAvance = asignaciones.some((a) => a.cantidad_hecha > 0);
  const avance = resumirAvance(asignaciones.filter((a) => a.pastelera_id !== null));

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
    onError: (e) =>
      setErrorCelda(
        `No se pudo guardar el cambio (${e instanceof Error ? e.message : "error"}). Intentá de nuevo.`
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
    ? { texto: "Sin generar", clase: "bg-muted text-muted-foreground" }
    : plan.estado === "publicado"
      ? {
          texto: `Publicado a cocina${plan.publicado_at ? ` · ${horaCorta(plan.publicado_at)}` : ""}`,
          clase: "bg-[#2E7D32]/10 text-[#2E7D32]",
        }
      : { texto: "Borrador", clase: "bg-[#B45309]/10 text-[#B45309]" };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Reparto de producción</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{fechaLegible}</span>
            <ChipColorDia fecha={fecha} />
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoPlan.clase}`}>
              {estadoPlan.texto}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/cuadros"
            className="text-sm font-medium text-[#1F4E79] underline-offset-4 hover:underline"
          >
            ← Cuadros
          </Link>
          <Button
            variant="outline"
            disabled={pendiente}
            onClick={() =>
              asignaciones.length > 0
                ? setConfirmarGenerar(true)
                : ejecutar(generarRepartoDelDia)
            }
          >
            {asignaciones.length > 0 ? "Volver a generar" : "Generar reparto"}
          </Button>
          {plan && (
            <Link
              href="/asignar/imprimir"
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Imprimir hojas
            </Link>
          )}
          {plan?.estado === "publicado" ? (
            <Button
              variant="outline"
              disabled={pendiente}
              onClick={() => ejecutar(() => cambiarEstadoReparto(false))}
            >
              Volver a borrador
            </Button>
          ) : (
            <Button
              className="bg-[#1F4E79] hover:bg-[#1F4E79]/90"
              disabled={pendiente || !plan || asignaciones.length === 0}
              onClick={() => ejecutar(() => cambiarEstadoReparto(true))}
            >
              Publicar a cocina
            </Button>
          )}
        </div>
      </div>

      {aviso && (
        <p
          role="status"
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            aviso.ok ? "bg-[#2E7D32]/10 text-[#2E7D32]" : "bg-[#B3261E]/10 text-[#B3261E]"
          }`}
        >
          {aviso.mensaje}
        </p>
      )}
      {errorCelda && (
        <p role="status" className="rounded-md bg-[#B3261E]/10 px-3 py-2 text-sm font-medium text-[#B3261E]">
          {errorCelda}
        </p>
      )}
      {sucursalesPendientes > 0 && (
        <p className="rounded-md bg-[#B45309]/10 px-3 py-2 text-sm font-medium text-[#B45309]">
          {sucursalesPendientes === 1
            ? "1 sucursal aún no cierra el día"
            : `${sucursalesPendientes} sucursales aún no cierran el día`}
          : si generás ahora, sus cantidades usan el objetivo o la captura parcial.
        </p>
      )}
      {areasDescuadradas.length > 0 && (
        <p className="rounded-md bg-[#B45309]/10 px-3 py-2 text-sm text-[#B45309]">
          Porcentajes que no suman 100 %:{" "}
          {areasDescuadradas
            .map((a) => `${a.nombre} (${sumas.get(a.id) ?? 0} %)`)
            .join(", ")}
          .{" "}
          <Link href="/pasteleras" className="font-semibold underline">
            Ajustar pasteleras
          </Link>
        </p>
      )}
      {sinAsignar.length > 0 && (
        <p className="rounded-md bg-[#B45309]/10 px-3 py-2 text-sm text-[#B45309]">
          {sinAsignar.length} asignaciones sin pastelera (productos sin área o
          áreas sin pasteleras activas). Repartilas a mano en la columna
          &quot;Sin asignar&quot; o configurá las pasteleras.
        </p>
      )}

      {asignaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay reparto para hoy. Cuando las sucursales cierren,
          tocá <span className="font-semibold">Generar reparto</span>: se
          toma el total de cada producto del cuadro y se divide entre las
          pasteleras de su área según su porcentaje fijo.
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-3 text-sm">
            <span className="font-semibold">Avance de cocina:</span>{" "}
            <span className="tabular-nums">
              {avance.listas}/{avance.tareas} tareas listas · {avance.hechas}/
              {avance.total} unidades
            </span>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-[#2E7D32] transition-all"
                style={{
                  width: `${avance.total ? Math.round((avance.hechas / avance.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada pastelera tiene 4 casillas: tandas 1, 2, 3 y 4 (el
            &quot;1*2*3*4&quot; del Excel). El reparto se genera todo en la
            tanda 1; mové cantidades a otras tandas si hace falta. Celda vacía
            = 0. Debajo de cada casilla se ve lo que la pastelera ya marcó como
            hecho.
          </p>
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
            <DialogTitle>¿Volver a generar el reparto?</DialogTitle>
            <DialogDescription>
              Se reemplazan todas las asignaciones de hoy con las cantidades
              actuales del cuadro, se pierden los ajustes a mano y el reparto
              vuelve a borrador.
              {conAvance && (
                <span className="mt-2 block font-semibold text-[#B3261E]">
                  Ojo: algunas pasteleras ya marcaron avance y se va a borrar.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmarGenerar(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#1F4E79] hover:bg-[#1F4E79]/90"
              disabled={pendiente}
              onClick={() => {
                setConfirmarGenerar(false);
                ejecutar(generarRepartoDelDia);
              }}
            >
              Volver a generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
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
  totalesCuadro: Record<number, number>;
}) {
  const nombreColumna = (p: PasteleraDia | null) =>
    p ? `${p.nombre}${p.activa ? "" : " (inactiva)"}` : "Sin asignar";

  return (
    <article className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2">
        <h2 className="font-bold">{seccion.titulo}</h2>
        <p className="text-xs text-muted-foreground">
          {seccion.columnas
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
              <th rowSpan={2} className="px-2 py-1.5 text-right font-semibold" title="Total del cuadro (suma de sugeridos)">
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
              const cuadro = totalesCuadro[p.id] ?? 0;
              const descuadre = asignado !== cuadro;
              return (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1 font-medium">
                    {nombreProducto(p)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {cuadro}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-semibold tabular-nums ${
                      descuadre ? "text-[#B45309]" : ""
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
                          {asig && asig.cantidad > 0 && (
                            <div
                              className={`text-[10px] leading-tight tabular-nums ${
                                asig.estado === "listo"
                                  ? "font-semibold text-[#2E7D32]"
                                  : asig.estado === "en_proceso"
                                    ? "text-[#B45309]"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {asig.estado === "listo" ? "✓ listo" : `${asig.cantidad_hecha}/${asig.cantidad}`}
                            </div>
                          )}
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
