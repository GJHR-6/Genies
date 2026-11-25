"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChefHat, Pencil, Plus, TriangleAlert } from "lucide-react";
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
import { guardarArea } from "@/lib/acciones/catalogos";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import {
  AvisoError,
  Campo,
  EstadoActivo,
  Interruptor,
  numeroONull,
  useAccion,
} from "../_componentes/campos";

type Area = {
  id: number;
  nombre: string;
  encargadas: string;
  orden: number;
  activa: boolean;
  es_decoracion: boolean;
  trabajo_en_equipo: boolean;
  pasteleras: { nombre: string; activa: boolean; orden: number }[];
};

/** Lo que imprime el cuadro: las pasteleras activas o, si no hay, el texto. */
function quienes(a: Area): { texto: string; dePasteleras: boolean } {
  const activas = [...a.pasteleras]
    .filter((p) => p.activa)
    .sort((x, y) => x.orden - y.orden)
    .map((p) => p.nombre);
  if (activas.length === 0) return { texto: a.encargadas, dePasteleras: false };
  return {
    texto: activas.join(activas.length === 2 ? " y " : ", "),
    dePasteleras: true,
  };
}
type Producto = {
  id: number;
  nombre: string;
  tamano: string | null;
  area_id: number | null;
};

export function AreasCliente({
  areas,
  productos,
}: {
  areas: Area[];
  productos: Producto[];
}) {
  const [editando, setEditando] = useState<Area | "nuevo" | null>(null);

  const porArea = useMemo(() => {
    const m = new Map<number | null, Producto[]>();
    for (const p of productos) {
      const lista = m.get(p.area_id);
      if (lista) lista.push(p);
      else m.set(p.area_id, [p]);
    }
    return m;
  }, [productos]);
  const sinArea = porArea.get(null) ?? [];
  const siguienteOrden = Math.max(0, ...areas.map((a) => a.orden)) + 1;

  return (
    <>
      <EncabezadoCatalogo actual="areas">
        <Button size="lg" onClick={() => setEditando("nuevo")}>
          <Plus />
          Nueva área
        </Button>
      </EncabezadoCatalogo>

      {sinArea.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            Hay <strong>{sinArea.length} productos sin área</strong>: salen en
            el cuadro final &quot;Sin área asignada&quot;. Asignales un área
            desde{" "}
            <Link
              href="/catalogos/productos"
              className="font-semibold underline"
            >
              Productos
            </Link>
            .
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Quién trabaja en cada área y con qué porcentaje se maneja en{" "}
        <Link
          href="/pasteleras"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Pasteleras
        </Link>
        .
      </p>

      <ul className="grid gap-4 md:grid-cols-2">
        {areas.map((a) => {
          const lista = porArea.get(a.id) ?? [];
          const personas = quienes(a);
          return (
            <li
              key={a.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-card p-4",
                !a.activa && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {a.orden}
                  </span>
                  <div>
                    <p className="font-semibold">{a.nombre}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ChefHat className="size-3.5" />
                      {personas.texto}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.es_decoracion && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Decoración
                    </span>
                  )}
                  {a.trabajo_en_equipo && !a.es_decoracion && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      En equipo
                    </span>
                  )}
                  {!a.activa && <EstadoActivo activo={false} />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditando(a)}
                  >
                    <Pencil />
                    Editar
                  </Button>
                </div>
              </div>
              {a.es_decoracion ? (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Recibe los productos marcados &quot;Lleva decoración&quot;. Si
                  no tiene pasteleras activas, cada área decora lo suyo.
                </p>
              ) : (
                <details className="group rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    {lista.length} productos en este cuadro
                  </summary>
                  <ul className="mt-2 columns-1 gap-4 text-sm sm:columns-2">
                    {lista.map((p) => (
                      <li key={p.id} className="break-inside-avoid py-0.5">
                        {p.nombre}
                        {p.tamano ? ` · ${p.tamano}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
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
            area={editando === "nuevo" ? null : editando}
            siguienteOrden={siguienteOrden}
            alCerrar={() => setEditando(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function Formulario({
  area,
  siguienteOrden,
  alCerrar,
}: {
  area: Area | null;
  siguienteOrden: number;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(area?.nombre ?? "");
  const [encargadas, setEncargadas] = useState(area?.encargadas ?? "");
  const [orden, setOrden] = useState(String(area?.orden ?? siguienteOrden));
  const [activa, setActiva] = useState(area?.activa ?? true);
  const [enEquipo, setEnEquipo] = useState(area?.trabajo_en_equipo ?? false);
  const { enviando, error, setError, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const n = numeroONull(orden);
    if (n === null) {
      setError("Escribí el número de orden del cuadro.");
      return;
    }
    ejecutar(
      () =>
        guardarArea({
          ...(area ? { id: area.id } : {}),
          nombre,
          encargadas,
          orden: n,
          activa,
          trabajo_en_equipo: enEquipo,
        }),
      alCerrar,
    );
  }

  return (
    <DialogContent>
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nueva área"}</DialogTitle>
          <DialogDescription>
            Cada área imprime su propio cuadro de producción.
          </DialogDescription>
        </DialogHeader>
        <Campo etiqueta="Nombre del área" htmlFor="area-nombre">
          <Input
            id="area-nombre"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Producción 6"
            className="h-10"
          />
        </Campo>
        <Campo
          etiqueta="Encargadas"
          htmlFor="area-encargadas"
          ayuda={
            area && quienes(area).dePasteleras
              ? "El cuadro imprime las pasteleras del área; este texto solo se usa si no tiene pasteleras activas."
              : "Se imprime en el encabezado del cuadro."
          }
        >
          <Input
            id="area-encargadas"
            value={encargadas}
            onChange={(e) => setEncargadas(e.target.value)}
            placeholder="Ej. Kenia y Dany"
            className="h-10"
          />
        </Campo>
        <Campo
          etiqueta="Orden de impresión"
          htmlFor="area-orden"
          ayuda="1 = primer cuadro. No puede repetirse."
        >
          <Input
            id="area-orden"
            inputMode="numeric"
            value={orden}
            onChange={(e) =>
              setOrden(e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            className="h-10 w-24"
          />
        </Campo>
        <Interruptor
          activo={activa}
          onCambio={setActiva}
          etiqueta="Activa"
          descripcion="Un área inactiva no imprime cuadro."
        />
        {!area?.es_decoracion && (
          <Interruptor
            activo={enEquipo}
            onCambio={setEnEquipo}
            etiqueta="Trabajan en equipo"
            descripcion="No se divide por porcentaje: sale una sola hoja con el nombre de todas (ej. «Kenia y Dany») y ellas se reparten el trabajo."
          />
        )}
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
