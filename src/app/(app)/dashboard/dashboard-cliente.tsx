"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  resumirDia,
  type ResumenSucursal,
  type SucursalBase,
} from "@/lib/resumen-dia";
import { ChipColorDia } from "@/components/color-dia";
import { Aviso, EncabezadoSeccion } from "@/components/encabezado-seccion";
import { GRUPO_HOY } from "@/lib/grupos";
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
  cerrado: { texto: "Terminó ✓", clase: "bg-exito/10 text-exito", barra: "bg-exito" },
  en_captura: { texto: "Contando…", clase: "bg-aviso/10 text-aviso", barra: "bg-aviso" },
  sin_iniciar: {
    texto: "No ha empezado",
    clase: "bg-muted text-muted-foreground",
    barra: "bg-muted-foreground/30",
  },
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
      <EncabezadoSeccion
        grupo={GRUPO_HOY}
        actual="tiendas"
        detalle={
          <>
            <span className="first-letter:uppercase">{fechaLegible}</span>
            <ChipColorDia fecha={fecha} />
            <span>· Se actualiza sola</span>
          </>
        }
      />

      {todasCerradas ? (
        <Aviso tipo="exito">
          Todas las tiendas terminaron su inventario. Los sugeridos y los cuadros
          ya están completos.
        </Aviso>
      ) : (
        <p className="text-sm text-muted-foreground">
          Si una tienda ya no va a cambiar nada pero olvidó terminar, podés
          cerrarle el día vos con su botón.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resumen.map((s) => {
          const estilo = ESTILO_ESTADO[s.estado];
          return (
            <div key={s.id} className="flex flex-col rounded-2xl border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{s.nombre}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${estilo.clase}`}
                >
                  {estilo.texto}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${estilo.barra}`}
                  style={{
                    width: `${totalProductos ? Math.min(100, Math.round((s.capturados / totalProductos) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {s.capturados} de {totalProductos} productos contados
              </p>
              <p className="text-sm text-muted-foreground">
                {s.ultimoRegistro
                  ? `Último cambio: ${horaTegucigalpa(s.ultimoRegistro)}`
                  : "Todavía no ha anotado nada hoy"}
              </p>
              <div className="mt-auto pt-3">
                {s.estado === "cerrado" ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      mutacionEstado.mutate({
                        sucursalId: s.id,
                        accion: "reabrir",
                      })
                    }
                    disabled={mutacionEstado.isPending}
                  >
                    Volver a abrir
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSucursalACerrar(s)}
                    disabled={mutacionEstado.isPending}
                  >
                    Cerrar el día
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
              productos contados. Después de cerrar, la tienda ya no podrá
              cambiar números (podés volver a abrirlo si hace falta).
            </DialogDescription>
          </DialogHeader>
          {mutacionEstado.isError && (
            <p className="text-sm text-destructive">
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
