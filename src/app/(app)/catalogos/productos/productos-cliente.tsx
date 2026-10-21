"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Sparkles } from "lucide-react";
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
import { guardarProducto } from "@/lib/acciones/catalogos";
import type { DatosProducto } from "@/lib/esquemas-catalogos";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import {
  AvisoError,
  Buscador,
  Campo,
  EstadoActivo,
  Interruptor,
  Selector,
  numeroONull,
  useAccion,
} from "../_componentes/campos";

type Producto = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
  departamento_id: number | null;
  area_id: number | null;
  orden_area: number | null;
  orden: number | null;
  temporada: boolean;
  libras: number | string | null;
  lleva_decoracion: boolean;
  activo: boolean;
};
type Opcion = { id: number; nombre: string };

type Filtro = "activos" | "inactivos" | "temporada" | "todos";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "activos", etiqueta: "Activos" },
  { valor: "inactivos", etiqueta: "Inactivos" },
  { valor: "temporada", etiqueta: "Temporada" },
  { valor: "todos", etiqueta: "Todos" },
];

export function ProductosCliente({
  productos,
  departamentos,
  areas,
}: {
  productos: Producto[];
  departamentos: (Opcion & { activo: boolean })[];
  areas: (Opcion & { activa: boolean })[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [departamento, setDepartamento] = useState("");
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);

  const nombreDepto = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d.nombre])),
    [departamentos]
  );
  const nombreArea = useMemo(
    () => new Map(areas.map((a) => [a.id, a.nombre])),
    [areas]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (filtro === "activos" && !p.activo) return false;
      if (filtro === "inactivos" && p.activo) return false;
      if (filtro === "temporada" && !p.temporada) return false;
      if (departamento && String(p.departamento_id) !== departamento)
        return false;
      if (!q) return true;
      return `${p.nombre} ${p.tamano ?? ""} ${p.categoria ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [productos, busqueda, filtro, departamento]);

  return (
    <>
      <EncabezadoCatalogo actual="productos">
        <Button size="lg" onClick={() => setEditando("nuevo")}>
          <Plus />
          Nuevo producto
        </Button>
      </EncabezadoCatalogo>

      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-3 sm:flex-row sm:items-center">
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          placeholder="Buscar por nombre o tamaño…"
        />
        <Selector
          value={departamento}
          onChange={(e) => setDepartamento(e.target.value)}
          className="bg-card sm:max-w-56"
          aria-label="Filtrar por departamento"
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </Selector>
        <div className="flex gap-1 rounded-full bg-card p-1 sm:ml-auto">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              className={cn(
                "min-h-8 rounded-full px-3 text-sm font-medium",
                filtro === f.valor
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {visibles.length} de {productos.length} productos
      </p>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay productos que coincidan con la búsqueda.
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {visibles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setEditando(p)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40",
                  !p.activo && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.nombre}
                    {p.tamano && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {p.tamano}
                      </span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    {p.departamento_id && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        {nombreDepto.get(p.departamento_id)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        p.area_id
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                      )}
                    >
                      {p.area_id ? nombreArea.get(p.area_id) : "Sin área"}
                    </span>
                    {p.lleva_decoracion && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <Sparkles className="size-3" />
                        Decorar
                      </span>
                    )}
                    {p.temporada && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                        Temporada
                      </span>
                    )}
                    {p.libras != null && (
                      <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums text-muted-foreground">
                        {Number(p.libras)} lb
                      </span>
                    )}
                    {!p.activo && <EstadoActivo activo={false} />}
                  </div>
                </div>
                <Pencil className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto) => !abierto && setEditando(null)}
      >
        {editando !== null && (
          <FormularioProducto
            key={editando === "nuevo" ? "nuevo" : editando.id}
            producto={editando === "nuevo" ? null : editando}
            departamentos={departamentos}
            areas={areas}
            alCerrar={() => setEditando(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function FormularioProducto({
  producto,
  departamentos,
  areas,
  alCerrar,
}: {
  producto: Producto | null;
  departamentos: (Opcion & { activo: boolean })[];
  areas: (Opcion & { activa: boolean })[];
  alCerrar: () => void;
}) {
  const [datos, setDatos] = useState({
    nombre: producto?.nombre ?? "",
    tamano: producto?.tamano ?? "",
    categoria: producto?.categoria ?? "",
    departamento_id: producto?.departamento_id ?? null,
    area_id: producto?.area_id ?? null,
    orden_area: producto?.orden_area?.toString() ?? "",
    orden: producto?.orden?.toString() ?? "",
    temporada: producto?.temporada ?? false,
    libras: producto?.libras != null ? String(Number(producto.libras)) : "",
    lleva_decoracion: producto?.lleva_decoracion ?? false,
    activo: producto?.activo ?? true,
  });
  const { enviando, error, ejecutar } = useAccion();

  const cambiar = <K extends keyof typeof datos>(
    campo: K,
    valor: (typeof datos)[K]
  ) => setDatos((d) => ({ ...d, [campo]: valor }));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const payload: DatosProducto = {
      ...(producto ? { id: producto.id } : {}),
      ...datos,
      orden_area: numeroONull(datos.orden_area),
      orden: numeroONull(datos.orden),
      libras: datos.libras.trim() === "" ? null : Number(datos.libras.replace(",", ".")),
    };
    ejecutar(() => guardarProducto(payload), alCerrar);
  }

  return (
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>
            {producto ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {producto
              ? "Los cambios se ven en el inventario de las tiendas y en los cuadros de inmediato."
              : "Aparece en el inventario de todas las tiendas. Después ponele sus objetivos en «Objetivos por tienda»."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo etiqueta="Nombre" htmlFor="prod-nombre">
              <Input
                id="prod-nombre"
                autoFocus
                value={datos.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                placeholder="Ej. VAINILLA"
                className="h-10"
              />
            </Campo>
          </div>
          <Campo
            etiqueta="Tamaño"
            htmlFor="prod-tamano"
            ayuda="Opcional. Ej. 8X2, 10X2"
          >
            <Input
              id="prod-tamano"
              value={datos.tamano}
              onChange={(e) => cambiar("tamano", e.target.value)}
              className="h-10"
            />
          </Campo>
          <Campo
            etiqueta="Categoría"
            htmlFor="prod-categoria"
            ayuda="Agrupa la lista del inventario."
          >
            <Input
              id="prod-categoria"
              value={datos.categoria}
              onChange={(e) => cambiar("categoria", e.target.value)}
              className="h-10"
            />
          </Campo>
          <Campo etiqueta="Departamento" htmlFor="prod-depto">
            <Selector
              id="prod-depto"
              value={datos.departamento_id ?? ""}
              onChange={(e) =>
                cambiar("departamento_id", numeroONull(e.target.value))
              }
            >
              <option value="">— Sin departamento —</option>
              {departamentos
                .filter((d) => d.activo || d.id === datos.departamento_id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
            </Selector>
          </Campo>
          <Campo
            etiqueta="Área de producción"
            htmlFor="prod-area"
            ayuda="En qué cuadro sale el producto."
          >
            <Selector
              id="prod-area"
              value={datos.area_id ?? ""}
              onChange={(e) => cambiar("area_id", numeroONull(e.target.value))}
            >
              <option value="">— Sin área asignada —</option>
              {areas
                .filter((a) => a.activa || a.id === datos.area_id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
            </Selector>
          </Campo>
          <Campo
            etiqueta="Posición en la lista"
            htmlFor="prod-orden"
            ayuda="La fila del Excel: número menor = más arriba. Manda el orden en el inventario, los cuadros y todas las hojas. Para meter uno entre dos, usá un número intermedio."
          >
            <Input
              id="prod-orden"
              inputMode="numeric"
              value={datos.orden}
              onChange={(e) =>
                cambiar("orden", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              className="h-10"
            />
          </Campo>
          <Campo
            etiqueta="Libras por unidad"
            htmlFor="prod-libras"
            ayuda="Solo para los pasteles que se controlan por batidas (vainilla, chocolate, mixto…). Ej.: 1.75. Vacío = no se cuenta en las libras de la batida (máximo 100 lb)."
          >
            <Input
              id="prod-libras"
              inputMode="decimal"
              value={datos.libras}
              onChange={(e) =>
                cambiar("libras", e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))
              }
              className="h-10"
            />
          </Campo>
        </div>

        <div className="flex flex-col gap-2">
          <Interruptor
            activo={datos.lleva_decoracion}
            onCambio={(v) => cambiar("lleva_decoracion", v)}
            etiqueta="Lleva decoración"
            descripcion="Sale también en el cuadro de Decoración."
          />
          <Interruptor
            activo={datos.temporada}
            onCambio={(v) => cambiar("temporada", v)}
            etiqueta="De temporada"
            descripcion="Producto eventual (ej. de una fecha especial). Activalo o desactivalo cuando empiece o termine la temporada; su historial se conserva."
          />
          <Interruptor
            activo={datos.activo}
            onCambio={(v) => cambiar("activo", v)}
            etiqueta="Activo"
            descripcion={
              datos.activo
                ? "Se anota en el inventario y se produce."
                : "No aparece en el inventario ni en los cuadros. Su historial se conserva."
            }
          />
        </div>

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
