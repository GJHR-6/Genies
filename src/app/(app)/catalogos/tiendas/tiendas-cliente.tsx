"use client";

import { useState } from "react";
import { Palette, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { guardarColoresTienda } from "@/lib/acciones/catalogos";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import { AvisoError, Campo, useAccion } from "../_componentes/campos";

type Tienda = {
  id: number;
  nombre: string;
  es_principal: boolean;
  colores_decoracion: string | null;
};

export function TiendasCliente({ tiendas }: { tiendas: Tienda[] }) {
  const [editando, setEditando] = useState<Tienda | null>(null);

  return (
    <>
      <EncabezadoCatalogo actual="tiendas" />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiendas.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setEditando(t)}
              className="group flex h-full w-full items-start justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {t.nombre}
                  {t.es_principal ? " (Principal)" : ""}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {t.colores_decoracion ?? "Sin colores anotados. Tocá para escribirlos."}
                </p>
              </div>
              <Pencil className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={editando !== null} onOpenChange={(a) => !a && setEditando(null)}>
        {editando && (
          <Formulario key={editando.id} tienda={editando} alCerrar={() => setEditando(null)} />
        )}
      </Dialog>
    </>
  );
}

function Formulario({ tienda, alCerrar }: { tienda: Tienda; alCerrar: () => void }) {
  const [texto, setTexto] = useState(tienda.colores_decoracion ?? "");
  const { enviando, error, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () => guardarColoresTienda({ id: tienda.id, colores_decoracion: texto }),
      alCerrar
    );
  }

  return (
    <DialogContent>
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Colores de {tienda.nombre}
          </DialogTitle>
          <DialogDescription>
            Cómo se decoran los pasteles de esta tienda. Sale en la hoja
            completa y en la hoja de despacho de la tienda.
          </DialogDescription>
        </DialogHeader>
        <Campo
          etiqueta="Colores de los pasteles"
          htmlFor="tienda-colores"
          ayuda="Ej.: «Va con el color del día» o «Rosado y multicolor; nada negro»."
        >
          <textarea
            id="tienda-colores"
            autoFocus
            rows={4}
            maxLength={300}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </Campo>
        <AvisoError mensaje={error} />
        <DialogFooter>
          <Button type="button" variant="outline" size="lg" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
