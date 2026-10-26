"use client";

import { useMemo, useState } from "react";
import { Check, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { guardarReglas } from "@/lib/acciones/catalogos";
import { EncabezadoCatalogo } from "../_componentes/encabezado";
import { AvisoError, Buscador, useAccion } from "../_componentes/campos";

type Producto = {
  id: number;
  nombre: string;
  tamano: string | null;
  categoria: string | null;
};
type Sucursal = { id: number; nombre: string };
type Regla = {
  producto_id: number;
  sucursal_id: number;
  dia_semana: number | null;
  objetivo: number;
};

/** Columnas de la tabla: null = todos los días; luego lunes … domingo. */
const DIAS: { valor: number | null; corto: string; largo: string }[] = [
  { valor: null, corto: "Todos", largo: "Todos los días" },
  { valor: 1, corto: "Lun", largo: "Lunes" },
  { valor: 2, corto: "Mar", largo: "Martes" },
  { valor: 3, corto: "Mié", largo: "Miércoles" },
  { valor: 4, corto: "Jue", largo: "Jueves" },
  { valor: 5, corto: "Vie", largo: "Viernes" },
  { valor: 6, corto: "Sáb", largo: "Sábado" },
  { valor: 0, corto: "Dom", largo: "Domingo" },
];

const clave = (sucursalId: number, dia: number | null) =>
  `${sucursalId}:${dia ?? "t"}`;

export function ReglasCliente({
  productos,
  sucursales,
  reglas,
  productoInicial,
}: {
  productos: Producto[];
  sucursales: Sucursal[];
  reglas: Regla[];
  productoInicial: number | null;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<number | null>(
    productoInicial ?? productos[0]?.id ?? null
  );

  const reglasPorProducto = useMemo(() => {
    const m = new Map<number, Regla[]>();
    for (const r of reglas) {
      const lista = m.get(r.producto_id);
      if (lista) lista.push(r);
      else m.set(r.producto_id, [r]);
    }
    return m;
  }, [reglas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      `${p.nombre} ${p.tamano ?? ""}`.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const producto = productos.find((p) => p.id === seleccionado) ?? null;

  function elegir(id: number) {
    setSeleccionado(id);
    // Mantiene el producto en la URL para poder recargar o compartir el enlace.
    window.history.replaceState(null, "", `?producto=${id}`);
  }

  return (
    <>
      <EncabezadoCatalogo actual="reglas" />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 lg:max-h-[calc(100dvh-14rem)]">
          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar producto…"
          />
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto lg:max-h-none">
            {visibles.map((p) => {
              const n = reglasPorProducto.get(p.id)?.length ?? 0;
              const activo = p.id === seleccionado;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => elegir(p.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm",
                      activo
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-card"
                    )}
                  >
                    <span className="truncate">
                      {p.nombre}
                      {p.tamano ? ` · ${p.tamano}` : ""}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        activo
                          ? "text-primary-foreground/80"
                          : n === 0
                            ? "font-medium text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {n === 0 ? "sin objetivos" : n}
                    </span>
                  </button>
                </li>
              );
            })}
            {visibles.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Sin resultados.
              </li>
            )}
          </ul>
        </aside>

        {producto ? (
          <EditorObjetivos
            key={producto.id}
            producto={producto}
            sucursales={sucursales}
            reglas={reglasPorProducto.get(producto.id) ?? []}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <Target className="size-8" />
            Elegí un producto de la lista para ver sus objetivos.
          </div>
        )}
      </div>
    </>
  );
}

function EditorObjetivos({
  producto,
  sucursales,
  reglas,
}: {
  producto: Producto;
  sucursales: Sucursal[];
  reglas: Regla[];
}) {
  const guardados = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reglas) m.set(clave(r.sucursal_id, r.dia_semana), r.objetivo);
    return m;
  }, [reglas]);

  // Solo las celdas tocadas; el resto muestra lo guardado.
  const [ediciones, setEdiciones] = useState<Record<string, string>>({});
  const [guardadoOk, setGuardadoOk] = useState(false);
  const { enviando, error, ejecutar } = useAccion();

  const valor = (k: string) =>
    k in ediciones ? ediciones[k] : (guardados.get(k)?.toString() ?? "");

  const cambios = Object.entries(ediciones).filter(([k, texto]) => {
    const antes = guardados.get(k);
    const ahora = texto === "" ? undefined : parseInt(texto, 10);
    return antes !== ahora;
  });

  function guardar() {
    setGuardadoOk(false);
    ejecutar(
      () =>
        guardarReglas({
          producto_id: producto.id,
          cambios: cambios.map(([k, texto]) => {
            const [suc, dia] = k.split(":");
            return {
              sucursal_id: Number(suc),
              dia_semana: dia === "t" ? null : Number(dia),
              objetivo: texto === "" ? null : parseInt(texto, 10),
            };
          }),
        }),
      () => {
        setEdiciones({});
        setGuardadoOk(true);
      }
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {producto.nombre}
            {producto.tamano && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {producto.tamano}
              </span>
            )}
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Unidades que cada tienda debe tener. <strong>Todos</strong> aplica
            cualquier día; si un día tiene su propio número, ese manda. Dejá la
            celda vacía para quitar el objetivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cambios.length > 0 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setEdiciones({})}
              disabled={enviando}
            >
              Descartar
            </Button>
          )}
          <Button
            size="lg"
            onClick={guardar}
            disabled={cambios.length === 0 || enviando}
          >
            <Save />
            {enviando
              ? "Guardando…"
              : cambios.length > 0
                ? `Guardar ${cambios.length} cambio${cambios.length === 1 ? "" : "s"}`
                : "Guardar"}
          </Button>
        </div>
      </div>

      <AvisoError mensaje={error} />
      {guardadoOk && cambios.length === 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Check className="size-4" />
          Objetivos guardados. Los sugeridos ya usan los números nuevos.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-[1] shadow-[1px_0_0_var(--border)] bg-muted px-3 py-2 text-left font-semibold">
                Sucursal
              </th>
              {DIAS.map((d) => (
                <th
                  key={d.corto}
                  title={d.largo}
                  className={cn(
                    "px-1 py-2 text-center font-semibold",
                    d.valor === null && "bg-amber-100/60 dark:bg-amber-950/40"
                  )}
                >
                  {d.corto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sucursales.map((s) => (
              <tr key={s.id} className="border-t">
                <th className="sticky left-0 z-[1] shadow-[1px_0_0_var(--border)] bg-card px-3 py-1.5 text-left font-medium">
                  {s.nombre}
                </th>
                {DIAS.map((d) => {
                  const k = clave(s.id, d.valor);
                  const texto = valor(k);
                  const cambiada =
                    k in ediciones &&
                    guardados.get(k) !==
                      (texto === "" ? undefined : parseInt(texto, 10));
                  return (
                    <td
                      key={d.corto}
                      className={cn(
                        "px-1 py-1 text-center",
                        d.valor === null && "bg-amber-50/60 dark:bg-amber-950/20"
                      )}
                    >
                      <input
                        inputMode="numeric"
                        value={texto}
                        onChange={(e) =>
                          setEdiciones((prev) => ({
                            ...prev,
                            [k]: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                        placeholder="—"
                        aria-label={`Objetivo de ${s.nombre}, ${d.largo}`}
                        className={cn(
                          "h-9 w-14 rounded-md border bg-background text-center tabular-nums outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          cambiada &&
                            "border-primary bg-primary/10 font-semibold text-primary"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
