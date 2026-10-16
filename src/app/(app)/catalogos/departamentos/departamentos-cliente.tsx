"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { guardarDepartamento } from "@/lib/acciones/catalogos";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import {
  AvisoError,
  Campo,
  EstadoActivo,
  Interruptor,
  useAccion,
} from "../_componentes/campos";

type Departamento = { id: number; nombre: string; activo: boolean };

export function DepartamentosCliente({
  departamentos,
  productosPorDepto,
}: {
  departamentos: Departamento[];
  productosPorDepto: Record<number, number>;
}) {
  const [editando, setEditando] = useState<Departamento | "nuevo" | null>(null);

  return (
    <>
      <EncabezadoCatalogo actual="departamentos">
        <Button size="lg" onClick={() => setEditando("nuevo")}>
          <Plus />
          Nuevo departamento
        </Button>
      </EncabezadoCatalogo>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departamentos.map((d) => {
          const n = productosPorDepto[d.id] ?? 0;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setEditando(d)}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                  !d.activo && "opacity-60"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.nombre}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n === 1 ? "1 producto activo" : `${n} productos activos`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <EstadoActivo activo={d.activo} />
                  <Pencil className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
      >
        {editando !== null && (
          <Formulario
            key={editando === "nuevo" ? "nuevo" : editando.id}
            departamento={editando === "nuevo" ? null : editando}
            alCerrar={() => setEditando(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function Formulario({
  departamento,
  alCerrar,
}: {
  departamento: Departamento | null;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(departamento?.nombre ?? "");
  const [activo, setActivo] = useState(departamento?.activo ?? true);
  const { enviando, error, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () =>
        guardarDepartamento({
          ...(departamento ? { id: departamento.id } : {}),
          nombre,
          activo,
        }),
      alCerrar
    );
  }

  return (
    <DialogContent>
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>
            {departamento ? "Editar departamento" : "Nuevo departamento"}
          </DialogTitle>
          <DialogDescription>
            Agrupa productos parecidos (por ejemplo, todos los de vainilla).
          </DialogDescription>
        </DialogHeader>
        <Campo etiqueta="Nombre" htmlFor="depto-nombre">
          <Input
            id="depto-nombre"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-10"
          />
        </Campo>
        <Interruptor
          activo={activo}
          onCambio={setActivo}
          etiqueta="Activo"
          descripcion="Los departamentos inactivos no se ofrecen al crear productos."
        />
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
