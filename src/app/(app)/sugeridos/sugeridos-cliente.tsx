"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import type { CeldaSugerido } from "@/lib/sugeridos";

type Producto = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
};

type Sucursal = { id: number; nombre: string };

type Props = {
  fecha: string;
  fechaLegible: string;
  productos: Producto[];
  sucursales: Sucursal[];
  celdasIniciales: Record<string, CeldaSugerido>;
};

export function SugeridosCliente({
  fecha,
  fechaLegible,
  productos,
  sucursales,
  celdasIniciales,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [celdas, setCeldas] =
    useState<Record<string, CeldaSugerido>>(celdasIniciales);
  const [edicion, setEdicion] = useState<{ clave: string; valor: string } | null>(
    null
  );
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

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Sugeridos</h1>
          <p className="text-sm text-muted-foreground">{fechaLegible}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#1F4E79] underline-offset-4 hover:underline"
          >
            ← Dashboard
          </Link>
          <Link
            href="/cuadros"
            className="rounded-md bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E79]/90"
          >
            Generar cuadros →
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Sugerido = objetivo − saldo. Hacé clic en una celda para ajustarlo;{" "}
        <span className="font-medium text-[#1F4E79]">azul con punto</span> =
        ajustado a mano, gris = calculado. Dejá la celda vacía para volver al
        calculado. Cursiva = la tienda aún no captura ese producto (saldo 0).
      </p>

      {errorGuardado && (
        <p
          role="status"
          className="rounded-md bg-[#B3261E]/10 px-3 py-1.5 text-xs font-medium text-[#B3261E]"
        >
          No se pudo guardar el ajuste. Revisá la conexión e intentá de nuevo.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-semibold">
                Producto
              </th>
              {sucursales.map((s) => (
                <th key={s.id} className="px-3 py-2 text-right font-semibold">
                  {s.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map(([categoria, lista]) => (
              <FilasCategoria
                key={categoria}
                categoria={categoria}
                productos={lista}
                sucursales={sucursales}
                celdas={celdas}
                edicion={edicion}
                setEdicion={setEdicion}
                confirmarEdicion={confirmarEdicion}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilasCategoria({
  categoria,
  productos,
  sucursales,
  celdas,
  edicion,
  setEdicion,
  confirmarEdicion,
}: {
  categoria: string;
  productos: Producto[];
  sucursales: Sucursal[];
  celdas: Record<string, CeldaSugerido>;
  edicion: { clave: string; valor: string } | null;
  setEdicion: (e: { clave: string; valor: string } | null) => void;
  confirmarEdicion: () => void;
}) {
  return (
    <>
      <tr className="border-b bg-muted/30">
        <td
          colSpan={sucursales.length + 1}
          className="sticky left-0 px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          {categoria}
        </td>
      </tr>
      {productos.map((p) => (
        <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/20">
          <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium">
            {p.nombre}
            {p.tamano ? ` · ${p.tamano}` : ""}
          </td>
          {sucursales.map((s) => {
            const clave = `${p.id}-${s.id}`;
            const celda = celdas[clave];
            if (!celda) {
              return (
                <td
                  key={s.id}
                  className="px-3 py-1.5 text-right text-muted-foreground"
                  title="Sin regla de sugerido"
                >
                  —
                </td>
              );
            }
            if (edicion?.clave === clave) {
              return (
                <td key={s.id} className="px-1 py-0.5 text-right">
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
                    aria-label={`Sugerido de ${p.nombre} en ${s.nombre}`}
                  />
                </td>
              );
            }
            return (
              <td key={s.id} className="px-1 py-0.5 text-right">
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
                  className={`w-full rounded px-2 py-1 text-right tabular-nums hover:bg-muted ${
                    celda.esOverride
                      ? "font-semibold text-[#1F4E79]"
                      : "text-muted-foreground"
                  } ${celda.conCaptura ? "" : "italic"}`}
                  aria-label={`Sugerido de ${p.nombre} en ${s.nombre}: ${celda.sugerido}${celda.esOverride ? " (ajustado)" : ""}`}
                >
                  {celda.esOverride ? "• " : ""}
                  {celda.sugerido}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
