"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
import type { CeldaSugerido } from "@/lib/sugeridos";
import { filaHojaCompleta } from "@/lib/hoja-completa";
import { cn } from "@/lib/utils";

type Producto = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
  lleva_decoracion: boolean;
};

type Sucursal = { id: number; nombre: string };

/** Lo que Principal anotó hoy, para DECO / SIN DECO / INV/TOTAL y CM. */
type DatosPrincipal = {
  id: number | null;
  sinDecorar: Record<number, number>;
  decorado: Record<number, number>;
  saldo: Record<number, number>;
  cambios: Record<string, number>;
};

type Props = {
  fecha: string;
  fechaLegible: string;
  /** Ya vienen en el orden del Excel. */
  productos: Producto[];
  sucursales: Sucursal[];
  celdasIniciales: Record<string, CeldaSugerido>;
  principal: DatosPrincipal;
};

type Edicion = { clave: string; valor: string } | null;

export function SugeridosCliente({
  fecha,
  fechaLegible,
  productos,
  sucursales,
  celdasIniciales,
  principal,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [celdas, setCeldas] =
    useState<Record<string, CeldaSugerido>>(celdasIniciales);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [errorGuardado, setErrorGuardado] = useState(false);

  const mutacionOverride = useMutation({
    mutationFn: async (vars: {
      clave: string;
      productoId: number;
      sucursalId: number;
      valor: number | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: actualizadas, error: errActualiza } = await supabase
        .from("movimientos_diarios")
        .update({
          sugerido_override: vars.valor,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq("fecha", fecha)
        .eq("sucursal_id", vars.sucursalId)
        .eq("producto_id", vars.productoId)
        .select("id");
      if (errActualiza) throw new Error(errActualiza.message);
      if ((actualizadas ?? []).length > 0 || vars.valor === null) return;

      // La sucursal aún no capturó ese producto: crear la fila con el override.
      const { error: errInserta } = await supabase
        .from("movimientos_diarios")
        .insert({
          fecha,
          sucursal_id: vars.sucursalId,
          producto_id: vars.productoId,
          saldo_inicial: 0,
          ingreso: 0,
          devolucion: 0,
          pedido: 0,
          decorado: 0,
          sin_decorar: 0,
          sugerido_override: vars.valor,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        });
      if (errInserta) throw new Error(errInserta.message);
    },
    onSuccess: (_datos, vars) => {
      setErrorGuardado(false);
      setCeldas((prev) => {
        const celda = prev[vars.clave];
        if (!celda) return prev;
        const saldoEfectivo = celda.saldo ?? 0;
        return {
          ...prev,
          [vars.clave]: {
            ...celda,
            esOverride: vars.valor !== null,
            conCaptura: celda.conCaptura || vars.valor !== null,
            sugerido:
              vars.valor ?? Math.max(celda.objetivo - saldoEfectivo, 0),
          },
        };
      });
    },
    onError: () => setErrorGuardado(true),
  });

  const confirmarEdicion = () => {
    if (!edicion) return;
    const [productoId, sucursalId] = edicion.clave.split("-").map(Number);
    const texto = edicion.valor.trim();
    const valor = texto === "" ? null : parseInt(texto, 10);
    setEdicion(null);
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) return;
    const celda = celdas[edicion.clave];
    if (!celda) return;
    // Sin cambios: mismo override, o se limpió sin haber override.
    if (valor === null && !celda.esOverride) return;
    if (valor !== null && celda.esOverride && valor === celda.sugerido) return;
    mutacionOverride.mutate({
      clave: edicion.clave,
      productoId,
      sucursalId,
      valor,
    });
  };

  // Como INVENTARIO DIARIO: Principal no es columna de tienda (es el
  // INV/TOTAL); va al final, antes del total.
  const tiendas = sucursales.filter((x) => x.id !== principal.id);
  const sucursalPrincipal = sucursales.find((x) => x.id === principal.id) ?? null;

  const grupos = useMemo(() => {
    const porCategoria = new Map<string, Producto[]>();
    for (const p of productos) {
      const cat = p.categoria ?? "Sin categoría";
      const lista = porCategoria.get(cat);
      if (lista) lista.push(p);
      else porCategoria.set(cat, [p]);
    }
    return [...porCategoria.entries()];
  }, [productos]);

  const celdaProps = { celdas, edicion, setEdicion, confirmarEdicion };
  const columnas = 4 + tiendas.length * 2 + 1 + (sucursalPrincipal ? 1 : 0) + 1;

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoSeccion
        grupo={GRUPO_HOY}
        actual="sugeridos"
        detalle={<span className="first-letter:uppercase">{fechaLegible}</span>}
      />

      <div className="grid gap-3 rounded-2xl border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold">1. Lo que hay en Principal.</span>{" "}
          <span className="text-muted-foreground">
            DECO, SIN DECO e INV/TOTAL salen del inventario de Principal de hoy.
          </span>
        </p>
        <p>
          <span className="font-semibold">2. Lo que se manda a cada tienda.</span>{" "}
          <span className="text-muted-foreground">
            Ya viene calculado (objetivo − lo que la tienda tiene). Tocá un
            número para cambiarlo y presioná Enter; vacío = vuelve al calculado.
            CM = cambio de la tienda.
          </span>
        </p>
        <p>
          <span className="font-semibold">3. Revisá el SALDO.</span>{" "}
          <span className="text-muted-foreground">
            INV/TOTAL + CM − lo que se manda. En{" "}
            <span className="font-semibold text-destructive">rojo</span>, falta
            producto: hay que hornear o mandar menos.
          </span>
        </p>
        <p className="text-muted-foreground sm:col-span-3">
          <span className="rounded bg-muted px-1">12</span> = calculado ·{" "}
          <span className="font-semibold text-primary">• 12</span> = cambiado a
          mano · <span className="italic">12</span> en cursiva = la tienda aún
          no anota ese producto · — = la tienda no lleva ese producto
        </p>
      </div>

      {errorGuardado && (
        <Aviso tipo="error">
          No se pudo guardar el cambio. Revisá que haya internet e intentá de
          nuevo.
        </Aviso>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase">
              <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-semibold">
                Producto
              </th>
              <th className="border-l px-2 py-2 text-right font-semibold">Deco</th>
              <th className="px-2 py-2 text-right font-semibold">Sin deco</th>
              <th className="px-2 py-2 text-right font-semibold">Inv/Total</th>
              {tiendas.map((t) => (
                <Fragment key={t.id}>
                  <th className="border-l px-2 py-2 text-right font-semibold">
                    {t.nombre}
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground">
                    CM
                  </th>
                </Fragment>
              ))}
              <th className="border-l px-2 py-2 text-right font-semibold">Saldo</th>
              {sucursalPrincipal && (
                <th
                  className="border-l px-2 py-2 text-right font-semibold"
                  title="Lo que necesita la vitrina de Principal"
                >
                  {sucursalPrincipal.nombre}
                </th>
              )}
              <th
                className="border-l px-2 py-2 text-right font-semibold"
                title="Suma de todas las sucursales (el total del cuadro)"
              >
                Sugerido
              </th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(([categoria, lista]) => (
              <Fragment key={categoria}>
                <tr className="border-b bg-muted/30">
                  <td
                    colSpan={columnas}
                    className="sticky left-0 px-3 py-1.5 text-xs font-semibold"
                  >
                    {categoria}
                  </td>
                </tr>
                {lista.map((p) => {
                  const fila = filaHojaCompleta(
                    {
                      celdas,
                      sinDecorar: principal.sinDecorar,
                      decorado: principal.decorado,
                      cambios: principal.cambios,
                      saldoPrincipal: principal.saldo,
                      principalId: principal.id,
                    },
                    p,
                    tiendas
                  );
                  const total = sucursales.reduce(
                    (t, x) => t + (celdas[`${p.id}-${x.id}`]?.sugerido ?? 0),
                    0
                  );
                  return (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium">
                        {p.nombre}
                        {p.tamano ? ` · ${p.tamano}` : ""}
                      </td>
                      <Numero valor={fila.deco} className="border-l" />
                      <Numero valor={fila.sinDeco} />
                      <Numero valor={fila.invTotal} className="font-semibold" />
                      {tiendas.map((t, i) => (
                        <Fragment key={t.id}>
                          <CeldaMandar
                            producto={p}
                            sucursal={t}
                            className="border-l"
                            {...celdaProps}
                          />
                          <Numero valor={fila.tiendas[i].cm} apagado />
                        </Fragment>
                      ))}
                      <td
                        className={cn(
                          "border-l px-2 py-1.5 text-right font-bold tabular-nums",
                          fila.saldo < 0 ? "bg-destructive/10 text-destructive" : "text-exito"
                        )}
                        title={
                          fila.saldo < 0
                            ? `Faltan ${-fila.saldo}`
                            : "Alcanza con lo que hay en Principal"
                        }
                      >
                        {fila.saldo}
                      </td>
                      {sucursalPrincipal && (
                        <CeldaMandar
                          producto={p}
                          sucursal={sucursalPrincipal}
                          className="border-l"
                          {...celdaProps}
                        />
                      )}
                      <td className="border-l px-2 py-1.5 text-right font-semibold tabular-nums">
                        {total || ""}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Número de solo lectura; vacío si no hay dato o es 0. */
function Numero({
  valor,
  className,
  apagado,
}: {
  valor: number | null;
  className?: string;
  apagado?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-2 py-1.5 text-right tabular-nums",
        apagado && "text-muted-foreground",
        className
      )}
    >
      {valor ? valor : ""}
    </td>
  );
}

/** Lo que se le manda a una sucursal: se toca para cambiarlo. */
function CeldaMandar({
  producto: p,
  sucursal: s,
  className,
  celdas,
  edicion,
  setEdicion,
  confirmarEdicion,
}: {
  producto: Producto;
  sucursal: Sucursal;
  className?: string;
  celdas: Record<string, CeldaSugerido>;
  edicion: Edicion;
  setEdicion: (e: Edicion) => void;
  confirmarEdicion: () => void;
}) {
  const clave = `${p.id}-${s.id}`;
  const celda = celdas[clave];
  const nombre = `${p.nombre}${p.tamano ? ` ${p.tamano}` : ""}`;
  if (!celda) {
    return (
      <td
        className={cn("px-2 py-1.5 text-right text-muted-foreground", className)}
        title="Este producto no tiene objetivo para esta tienda"
      >
        —
      </td>
    );
  }
  if (edicion?.clave === clave) {
    return (
      <td className={cn("px-1 py-0.5 text-right", className)}>
        <Input
          autoFocus
          inputMode="numeric"
          value={edicion.valor}
          onChange={(e) =>
            setEdicion({
              clave,
              valor: e.target.value.replace(/\D/g, "").slice(0, 5),
            })
          }
          onBlur={confirmarEdicion}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmarEdicion();
            if (e.key === "Escape") setEdicion(null);
          }}
          className="h-8 w-16 text-right tabular-nums"
          aria-label={`Sugerido de ${nombre} en ${s.nombre}`}
        />
      </td>
    );
  }
  return (
    <td className={cn("px-1 py-0.5 text-right", className)}>
      <button
        type="button"
        onClick={() =>
          setEdicion({
            clave,
            valor: celda.esOverride ? String(celda.sugerido) : "",
          })
        }
        title={
          celda.conCaptura
            ? `Objetivo ${celda.objetivo} − saldo ${celda.saldo ?? 0}`
            : `Sin captura hoy · objetivo ${celda.objetivo}`
        }
        className={cn(
          "w-full min-w-12 rounded border border-transparent px-2 py-1 text-right tabular-nums hover:border-border hover:bg-muted",
          celda.esOverride ? "font-semibold text-primary" : "",
          celda.conCaptura ? "" : "italic"
        )}
        aria-label={`Sugerido de ${nombre} en ${s.nombre}: ${celda.sugerido}${celda.esOverride ? " (ajustado)" : ""}`}
      >
        {celda.esOverride ? "• " : ""}
        {celda.sugerido}
      </button>
    </td>
  );
}
