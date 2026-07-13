"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  resumirDia,
  type ResumenSucursal,
  type SucursalBase,
} from "@/lib/resumen-dia";
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

const ESTILO_ESTADO = {
  cerrado: { texto: "Completo ✓", clase: "bg-[#2E7D32]/10 text-[#2E7D32]" },
  en_captura: { texto: "En captura ⟳", clase: "bg-[#B45309]/10 text-[#B45309]" },
  sin_iniciar: { texto: "Sin iniciar", clase: "bg-muted text-muted-foreground" },
} as const;

function horaTegucigalpa(iso: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Tegucigalpa",
  }).format(new Date(iso));
}

type Props = {
  fecha: string;
  fechaLegible: string;
  sucursales: SucursalBase[];
  totalProductos: number;
  resumenInicial: ResumenSucursal[];
};

export function DashboardCliente({
  fecha,
  fechaLegible,
  sucursales,
  totalProductos,
  resumenInicial,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const claveResumen = ["resumen-dia", fecha];
  const [sucursalACerrar, setSucursalACerrar] =
    useState<ResumenSucursal | null>(null);

  const { data: resumen } = useQuery({
    queryKey: claveResumen,
    queryFn: async (): Promise<ResumenSucursal[]> => {
      const [movimientosRes, cierresRes] = await Promise.all([
        supabase
          .from("movimientos_diarios")
          .select("sucursal_id, producto_id, updated_at")
          .eq("fecha", fecha),
        supabase
          .from("cierres_dia")
          .select("sucursal_id, estado")
          .eq("fecha", fecha),
      ]);
      if (movimientosRes.error) throw new Error(movimientosRes.error.message);
      if (cierresRes.error) throw new Error(cierresRes.error.message);
      return resumirDia(
        sucursales,
        movimientosRes.data ?? [],
        cierresRes.data ?? []
      );
    },
    initialData: resumenInicial,
    refetchInterval: 60_000,
  });

  // Tiempo real: cualquier cambio del día invalida el resumen.
  useEffect(() => {
    const invalidar = () => {
      void queryClient.invalidateQueries({ queryKey: ["resumen-dia", fecha] });
    };
    const canal = supabase
      .channel(`dia-${fecha}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "movimientos_diarios",
          filter: `fecha=eq.${fecha}`,
        },
        invalidar
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cierres_dia",
          filter: `fecha=eq.${fecha}`,
        },
        invalidar
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [supabase, queryClient, fecha]);

  const mutacionEstado = useMutation({
    mutationFn: async (vars: {
      sucursalId: number;
      accion: "cerrar" | "reabrir";
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("cierres_dia").upsert(
        vars.accion === "cerrar"
          ? {
              fecha,
              sucursal_id: vars.sucursalId,
              estado: "cerrado",
              cerrado_at: new Date().toISOString(),
              cerrado_by: user?.id ?? null,
            }
          : {
              fecha,
              sucursal_id: vars.sucursalId,
              estado: "en_captura",
              cerrado_at: null,
              cerrado_by: null,
            },
        { onConflict: "fecha,sucursal_id" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setSucursalACerrar(null);
      void queryClient.invalidateQueries({ queryKey: ["resumen-dia", fecha] });
    },
  });

  const todasCerradas =
    resumen.length > 0 && resumen.every((s) => s.estado === "cerrado");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{fechaLegible}</span>
            <ChipColorDia fecha={fecha} />
          </p>
        </div>
        <Link
          href="/sugeridos"
          className="text-sm font-medium text-[#1F4E79] underline-offset-4 hover:underline"
        >
          Ver sugeridos →
        </Link>
      </div>

      {todasCerradas && (
        <Link
          href="/sugeridos"
          className="rounded-lg bg-[#1F4E79] px-4 py-3 text-center text-base font-semibold text-white hover:bg-[#1F4E79]/90"
        >
          Generar cuadros de producción →
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resumen.map((s) => {
          const estilo = ESTILO_ESTADO[s.estado];
          return (
            <div key={s.id} className="rounded-lg border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{s.nombre}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${estilo.clase}`}
                >
                  {estilo.texto}
                </span>
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {s.capturados}/{totalProductos} productos
              </p>
              <p className="text-sm text-muted-foreground">
                {s.ultimoRegistro
                  ? `Último registro: ${horaTegucigalpa(s.ultimoRegistro)}`
                  : "Sin registros hoy"}
              </p>
              <div className="mt-3">
                {s.estado === "cerrado" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      mutacionEstado.mutate({
                        sucursalId: s.id,
                        accion: "reabrir",
                      })
                    }
                    disabled={mutacionEstado.isPending}
                  >
                    Reabrir día
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSucursalACerrar(s)}
                    disabled={mutacionEstado.isPending}
                  >
                    Cerrar día
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={sucursalACerrar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setSucursalACerrar(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Cerrar el día de {sucursalACerrar?.nombre}?</DialogTitle>
            <DialogDescription>
              Lleva {sucursalACerrar?.capturados ?? 0} de {totalProductos}{" "}
              productos con captura. La tienda quedará en modo lectura.
            </DialogDescription>
          </DialogHeader>
          {mutacionEstado.isError && (
            <p className="text-sm text-[#B3261E]">
              No se pudo cerrar el día. Intentá de nuevo.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSucursalACerrar(null)}
              disabled={mutacionEstado.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#1F4E79] hover:bg-[#1F4E79]/90"
              onClick={() =>
                sucursalACerrar &&
                mutacionEstado.mutate({
                  sucursalId: sucursalACerrar.id,
                  accion: "cerrar",
                })
              }
              disabled={mutacionEstado.isPending}
            >
              {mutacionEstado.isPending ? "Cerrando…" : "Cerrar el día"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
