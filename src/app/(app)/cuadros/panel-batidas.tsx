"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_BATIDAS,
  batidasDelCuadro,
  claveBatida,
  type AjusteBatida,
} from "@/lib/batidas";

type Clase = AjusteBatida["tipo"];

/** Lo que cambió en el panel: número = a mano; null = vuelve a lo automático. */
export type CambioBatida = { tipo: Clase; tanda: number; cantidad: number | null };

/**
 * Panel para escribir DEC y PROD de un producto, batida por batida (hasta
 * 10). Las casillas vacías usan lo automático (en gris): DEC 1 = sin
 * decorar, DEC 2 = lo que se hornea, PROD = reparto.
 */
export function PanelBatidas({
  producto,
  numBatidas,
  agregarBatida,
  prodReparto,
  sinDecorar,
  ajustes,
  librasPorUnidad,
  guardando,
  alGuardar,
  alCerrar,
}: {
  producto: { id: number; nombre: string; lleva_decoracion: boolean };
  numBatidas: number;
  agregarBatida: () => void;
  prodReparto: readonly number[];
  sinDecorar: number;
  ajustes: readonly AjusteBatida[];
  librasPorUnidad: number | null;
  guardando: boolean;
  alGuardar: (cambios: CambioBatida[]) => void;
  alCerrar: () => void;
}) {
  // Lo escrito: solo las casillas cambiadas a mano (vacío = automático).
  const inicial = useMemo(
    () =>
      Object.fromEntries(
        ajustes
          .filter((a) => a.producto_id === producto.id)
          .map((a) => [claveBatida(producto.id, a.tipo, a.tanda), String(a.cantidad)])
      ),
    [ajustes, producto.id]
  );
  const [borrador, setBorrador] = useState<Record<string, string>>(inicial);

  // Cómo queda con lo escrito: lo que se ve en gris en las casillas vacías.
  const vista = useMemo(() => {
    const escritos: AjusteBatida[] = Object.entries(borrador)
      .filter(([, v]) => v.trim() !== "")
      .map(([clave, v]) => {
        const [, tipo, tanda] = clave.split("-");
        return {
          producto_id: producto.id,
          tipo: tipo as Clase,
          tanda: Number(tanda),
          cantidad: parseInt(v, 10),
        };
      });
    const r = batidasDelCuadro({
      productos: [producto],
      prodReparto: new Map([[producto.id, prodReparto]]),
      sinDecorar: { [producto.id]: sinDecorar },
      ajustes: escritos,
    });
    return {
      dec: r.dec.get(producto.id) ?? [],
      prod: r.prod.get(producto.id) ?? [],
    };
  }, [borrador, producto, prodReparto, sinDecorar]);

  const guardar = () => {
    const cambios: CambioBatida[] = [];
    for (const tipo of ["decoracion", "produccion"] as const) {
      for (let tanda = 1; tanda <= MAX_BATIDAS; tanda++) {
        const clave = claveBatida(producto.id, tipo, tanda);
        const antes = inicial[clave] ?? "";
        const ahora = (borrador[clave] ?? "").trim();
        if (antes === ahora) continue;
        cambios.push({ tipo, tanda, cantidad: ahora === "" ? null : parseInt(ahora, 10) });
      }
    }
    if (cambios.length === 0) alCerrar();
    else alGuardar(cambios);
  };

  const casilla = (tipo: Clase, i: number) => {
    const clave = claveBatida(producto.id, tipo, i + 1);
    const automatico = (tipo === "decoracion" ? vista.dec : vista.prod)[i] ?? 0;
    const escrito = (borrador[clave] ?? "") !== "";
    return (
      <Input
        inputMode="numeric"
        value={borrador[clave] ?? ""}
        onChange={(e) =>
          setBorrador((b) => ({ ...b, [clave]: e.target.value.replace(/\D/g, "").slice(0, 5) }))
        }
        placeholder={automatico ? String(automatico) : "0"}
        className={`h-10 text-right text-base tabular-nums ${escrito ? "font-semibold text-primary" : ""}`}
        aria-label={`${tipo === "decoracion" ? "Dec" : "Prod"} batida ${i + 1} de ${producto.nombre}`}
      />
    );
  };

  const totalDec = vista.dec.reduce((t, c) => t + c, 0);
  const totalProd = vista.prod.reduce((t, c) => t + c, 0);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{producto.nombre}</DialogTitle>
          <DialogDescription>
            Cuánto se decora y se hornea en cada batida. En gris, lo automático
            (Dec 1 = lo que está sin decorar; Dec 2 = lo que se hornea; Prod =
            reparto). Escribí un número para cambiarlo; borralo para volver a
            lo automático.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="text-xs font-semibold text-muted-foreground">Batida</span>
          <span className="text-right text-xs font-semibold text-muted-foreground">Dec</span>
          <span className="text-right text-xs font-semibold text-muted-foreground">Prod</span>
          <span className="w-14 text-right text-xs font-semibold text-muted-foreground">
            {librasPorUnidad ? "lb" : ""}
          </span>
          {Array.from({ length: numBatidas }, (_, i) => (
            <div key={i} className="contents">
              <span className="font-semibold tabular-nums">{i + 1}</span>
              {casilla("decoracion", i)}
              {casilla("produccion", i)}
              <span className="w-14 text-right tabular-nums text-muted-foreground">
                {librasPorUnidad && vista.prod[i]
                  ? Math.round(vista.prod[i] * librasPorUnidad * 100) / 100
                  : ""}
              </span>
            </div>
          ))}
          <span className="font-semibold">Total</span>
          <span className="pr-3 text-right font-semibold tabular-nums">{totalDec}</span>
          <span className="pr-3 text-right font-semibold tabular-nums">{totalProd}</span>
          <span />
        </div>

        {numBatidas < MAX_BATIDAS && (
          <Button type="button" variant="outline" onClick={agregarBatida} className="justify-self-start">
            <Plus />
            Agregar batida {numBatidas + 1}
          </Button>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
