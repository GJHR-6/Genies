"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { ChipColorDia } from "@/components/color-dia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRUPO_HOY } from "@/lib/grupos";
import {
  cantidadNoEnviada,
  cuandoFue,
  pendientes,
  pendientesPorTienda,
  type NoEnviado,
} from "@/lib/no-enviados";
import { cn } from "@/lib/utils";

export type TiendaEnvio = {
  id: number;
  nombre: string;
  /** Lo que se le manda hoy (solo productos con algo). */
  filas: { productoId: number; mandar: number }[];
};

type EstadoFila = "guardando" | "guardado" | "error";

const clave = (sucursalId: number, productoId: number) => `${sucursalId}-${productoId}`;

export function EnviosCliente({
  fecha,
  fechaLegible,
  tiendas,
  nombres,
  nombresTienda,
  registrosIniciales,
}: {
  fecha: string;
  fechaLegible: string;
  tiendas: TiendaEnvio[];
  nombres: Record<number, string>;
  nombresTienda: Record<number, string>;
  registrosIniciales: NoEnviado[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [registros, setRegistros] = useState<NoEnviado[]>(registrosIniciales);
  const [tiendaId, setTiendaId] = useState<number | null>(tiendas[0]?.id ?? null);
  // Lo escrito en cada casilla de hoy (texto, para no pelear con el cursor).
  const [borrador, setBorrador] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      registrosIniciales
        .filter((r) => r.fecha === fecha)
        .map((r) => [clave(r.sucursal_id, r.producto_id), String(r.cantidad)])
    )
  );
  const [estados, setEstados] = useState<Record<string, EstadoFila>>({});

  const deHoy = useMemo(
    () =>
      new Map(
        registros
          .filter((r) => r.fecha === fecha)
          .map((r) => [clave(r.sucursal_id, r.producto_id), r])
      ),
    [registros, fecha]
  );
  const porTienda = useMemo(() => pendientesPorTienda(registros), [registros]);
  const listaPendientes = useMemo(() => pendientes(registros), [registros]);
  // Ya mandados (los de hoy y los que se marcaron en esta visita).
  const mandadosHoy = registros.filter((r) => r.enviado_at !== null);
  const nombre = (id: number) => nombres[id] ?? `Producto ${id}`;

  // Guardar la casilla "No se mandó" de hoy (vacío = se mandó todo).
  const guardarCantidad = useMutation({
    mutationFn: async (v: { sucursalId: number; productoId: number; cantidad: number | null }) => {
      if (v.cantidad === null) {
        const { error } = await supabase
          .from("no_enviados")
          .delete()
          .eq("fecha", fecha)
          .eq("sucursal_id", v.sucursalId)
          .eq("producto_id", v.productoId);
        if (error) throw new Error(error.message);
        return null;
      }
      const { data, error } = await supabase
        .from("no_enviados")
        .upsert(
          {
            fecha,
            sucursal_id: v.sucursalId,
            producto_id: v.productoId,
            cantidad: v.cantidad,
            enviado_at: null,
            enviado_by: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "fecha,sucursal_id,producto_id" }
        )
        .select("id, fecha, sucursal_id, producto_id, cantidad, enviado_at")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    retry: 2,
    onMutate: (v) =>
      setEstados((e) => ({ ...e, [clave(v.sucursalId, v.productoId)]: "guardando" })),
    onSuccess: (fila, v) => {
      const k = clave(v.sucursalId, v.productoId);
      setRegistros((rs) => {
        const sin = rs.filter(
          (r) => !(r.fecha === fecha && r.sucursal_id === v.sucursalId && r.producto_id === v.productoId)
        );
        return fila ? [...sin, fila] : sin;
      });
      setEstados((e) => ({ ...e, [k]: "guardado" }));
    },
    onError: (_e, v) =>
      setEstados((e) => ({ ...e, [clave(v.sucursalId, v.productoId)]: "error" })),
  });

  // "Ya se mandó" (o deshacerlo).
  const marcarEnviado = useMutation({
    mutationFn: async (v: { id: number; enviado: boolean }) => {
      const { data: usuario } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("no_enviados")
        .update({
          enviado_at: v.enviado ? new Date().toISOString() : null,
          enviado_by: v.enviado ? (usuario.user?.id ?? null) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    retry: 2,
    onSuccess: (_d, v) =>
      setRegistros((rs) =>
        rs.map((r) =>
          r.id === v.id ? { ...r, enviado_at: v.enviado ? new Date().toISOString() : null } : r
        )
      ),
  });

  const alSalir = (sucursalId: number, productoId: number, mandar: number) => {
    const k = clave(sucursalId, productoId);
    const cantidad = cantidadNoEnviada(borrador[k] ?? "", mandar);
    const actual = deHoy.get(k);
    setBorrador((b) => ({ ...b, [k]: cantidad === null ? "" : String(cantidad) }));
    if ((actual?.cantidad ?? null) === cantidad) return;
    guardarCantidad.mutate({ sucursalId, productoId, cantidad });
  };

  const tienda = tiendas.find((t) => t.id === tiendaId) ?? null;

  return (
    <section className="flex flex-col gap-5">
      <EncabezadoSeccion
        grupo={GRUPO_HOY}
        actual="envios"
        detalle={
          <>
            <span className="first-letter:uppercase">{fechaLegible}</span>
            <ChipColorDia fecha={fecha} />
          </>
        }
      />

      {/* Pendientes: lo que no salió y todavía no se mandó */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Pendiente de mandar
        </h2>
        {listaPendientes.length === 0 ? (
          <Aviso tipo="exito">No hay nada pendiente: todo lo anotado ya se mandó.</Aviso>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {listaPendientes.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{nombre(r.producto_id)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {nombresTienda[r.sucursal_id] ?? "Tienda"} · no salió {cuandoFue(r.fecha, fecha)}
                  </span>
                </span>
                <span className="text-lg font-bold tabular-nums">{r.cantidad}</span>
                <Button
                  size="sm"
                  onClick={() => marcarEnviado.mutate({ id: r.id, enviado: true })}
                  disabled={marcarEnviado.isPending}
                >
                  <Check />
                  Ya se mandó
                </Button>
              </li>
            ))}
          </ul>
        )}
        {mandadosHoy.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Mandados después, hoy ({mandadosHoy.length})
            </summary>
            <ul className="mt-2 divide-y rounded-xl border">
              {mandadosHoy.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-1.5">
                  <span className="flex-1">
                    {nombre(r.producto_id)} · {nombresTienda[r.sucursal_id]} · {r.cantidad}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => marcarEnviado.mutate({ id: r.id, enviado: false })}
                    disabled={marcarEnviado.isPending}
                  >
                    <Undo2 />
                    Deshacer
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {marcarEnviado.isError && (
          <p className="text-sm text-destructive">
            No se pudo guardar. Revisá que haya internet e intentá de nuevo.
          </p>
        )}
      </div>

      {/* Despacho de hoy: por tienda, cuánto no salió */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Despacho de hoy · escribí cuánto <strong>no</strong> se mandó (vacío = salió todo)
        </h2>
        {tiendas.length === 0 ? (
          <Aviso tipo="info">Todavía no hay tiendas.</Aviso>
        ) : (
          <>
            <div role="tablist" aria-label="Tienda" className="flex flex-wrap gap-2">
              {tiendas.map((t) => {
                const pend = porTienda.get(t.id) ?? 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={t.id === tiendaId}
                    onClick={() => setTiendaId(t.id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium",
                      t.id === tiendaId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent"
                    )}
                  >
                    {t.nombre}
                    {pend > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-xs tabular-nums",
                          t.id === tiendaId ? "bg-primary-foreground/20" : "bg-aviso/15 text-aviso"
                        )}
                      >
                        {pend}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {tienda && tienda.filas.length === 0 && (
              <Aviso tipo="info">
                Hoy no hay nada para mandar a {tienda.nombre} (no hizo pedido).
              </Aviso>
            )}

            {tienda && tienda.filas.length > 0 && (
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-semibold">Producto</th>
                      <th className="px-2 py-2 text-right font-semibold">Mandar</th>
                      <th className="w-28 px-3 py-2 text-right font-semibold">No se mandó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tienda.filas.map((f) => {
                      const k = clave(tienda.id, f.productoId);
                      const registro = deHoy.get(k);
                      const yaMandado = registro?.enviado_at != null;
                      const estado = estados[k];
                      return (
                        <tr key={k} className="border-b last:border-b-0">
                          <td className="px-3 py-1.5">
                            <span className="font-medium">{nombre(f.productoId)}</span>
                            {estado === "error" && (
                              <span className="block text-xs text-destructive">No se pudo guardar</span>
                            )}
                            {estado === "guardado" && registro && !yaMandado && (
                              <span className="block text-xs text-aviso">Pendiente ✓</span>
                            )}
                            {yaMandado && (
                              <span className="block text-xs text-exito">Se mandó después ✓</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right text-base font-semibold tabular-nums">
                            {f.mandar}
                          </td>
                          <td className="px-3 py-1.5">
                            <Input
                              inputMode="numeric"
                              value={borrador[k] ?? ""}
                              placeholder="0"
                              disabled={yaMandado}
                              onChange={(e) =>
                                setBorrador((b) => ({ ...b, [k]: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                              }
                              onBlur={() => alSalir(tienda.id, f.productoId, f.mandar)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              aria-label={`No se mandó de ${nombre(f.productoId)} a ${tienda.nombre}`}
                              className={cn(
                                "h-10 text-right text-base tabular-nums",
                                registro && !yaMandado && "border-aviso font-semibold text-aviso"
                              )}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
