"use client";

import { useMemo, useState } from "react";
import { EncabezadoCatalogo } from "../catalogos/_componentes/encabezado";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COLUMNAS_PASTELERA,
  aPastelera,
  type AreaDia,
  type PasteleraDia,
} from "@/lib/asignaciones";

type Props = { areas: AreaDia[]; pastelerasIniciales: PasteleraDia[] };

type Cambios = Partial<Pick<PasteleraDia, "nombre" | "porcentaje" | "activa" | "area_id" | "orden">>;

export function PastelerasCliente({ areas, pastelerasIniciales }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [pasteleras, setPasteleras] = useState(pastelerasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const actualizar = useMutation({
    mutationFn: async (vars: { id: number; cambios: Cambios }) => {
      const { data, error: err } = await supabase
        .from("pasteleras")
        .update(vars.cambios)
        .eq("id", vars.id)
        .select(COLUMNAS_PASTELERA)
        .single();
      if (err) throw new Error(err.message);
      return aPastelera(data);
    },
    onSuccess: (p) => {
      setError(null);
      setOk(`Guardado: ${p.nombre}`);
      setPasteleras((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    },
    onError: (e) => {
      setOk(null);
      setError(
        e instanceof Error && e.message.includes("duplicate")
          ? "Ya existe una pastelera con ese nombre."
          : "No se pudo guardar. Intentá de nuevo."
      );
    },
  });

  const agregar = useMutation({
    mutationFn: async (vars: { nombre: string; area_id: number; porcentaje: number }) => {
      const orden =
        Math.max(0, ...pasteleras.filter((p) => p.area_id === vars.area_id).map((p) => p.orden)) + 1;
      const { data, error: err } = await supabase
        .from("pasteleras")
        .insert({ ...vars, orden })
        .select(COLUMNAS_PASTELERA)
        .single();
      if (err) throw new Error(err.message);
      return aPastelera(data);
    },
    onSuccess: (p) => {
      setError(null);
      setOk(`Agregada: ${p.nombre}`);
      setPasteleras((prev) => [...prev, p]);
    },
    onError: (e) =>
      setError(
        e instanceof Error && e.message.includes("duplicate")
          ? "Ya existe una pastelera con ese nombre."
          : "No se pudo agregar. Intentá de nuevo."
      ),
  });

  // El porcentaje ya no se muestra (16 nov): sin reparto, cada área es de
  // su pastelera y su cuadro es la hoja de ella. Sigue en la base.

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoCatalogo actual="pasteleras" />

      <p className="text-sm text-muted-foreground">
        Quién trabaja en cada área. El cuadro de cada área sale a nombre de sus
        pasteleras activas. Las áreas marcadas «En equipo» (en Catálogos →
        Áreas) salen con el nombre de todas, sin dividir.
      </p>

      {error && (
        <p role="status" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {ok && !error && (
        <p role="status" className="rounded-md bg-exito/10 px-3 py-2 text-sm font-medium text-exito">
          {ok}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {areas
          .filter((a) => a.activa)
          .map((area) => {
            const lista = pasteleras
              .filter((p) => p.area_id === area.id)
              .sort((a, b) => Number(b.activa) - Number(a.activa) || a.orden - b.orden || a.id - b.id);
            return (
              <article key={area.id} className="rounded-lg border bg-card p-4">
                <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold">
                    {area.nombre}
                    {area.es_decoracion && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (si queda vacía, decora el área de cada producto)
                      </span>
                    )}
                  </h2>
                  {area.trabajo_en_equipo && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      En equipo · una sola hoja
                    </span>
                  )}
                </header>

                <ul className="flex flex-col gap-2">
                  {lista.map((p) => (
                    <FilaPastelera
                      key={p.id}
                      pastelera={p}
                      areas={areas}
                      guardar={(cambios) => actualizar.mutate({ id: p.id, cambios })}
                    />
                  ))}
                  {lista.length === 0 && (
                    <li className="text-sm text-muted-foreground">Sin pasteleras.</li>
                  )}
                </ul>

                <FormAgregar
                  areaId={area.id}
                  porcentajeSugerido={lista.some((p) => p.activa) ? 0 : 100}
                  onAgregar={(vars) => agregar.mutate(vars)}
                  ocupado={agregar.isPending}
                />
              </article>
            );
          })}
      </div>

    </section>
  );
}

function FilaPastelera({
  pastelera,
  areas,
  guardar,
}: {
  pastelera: PasteleraDia;
  areas: AreaDia[];
  guardar: (c: Cambios) => void;
}) {
  const [nombre, setNombre] = useState(pastelera.nombre);

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 ${
        pastelera.activa ? "" : "opacity-60"
      }`}
    >
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={() => {
          const limpio = nombre.trim();
          if (limpio && limpio !== pastelera.nombre) guardar({ nombre: limpio });
          else setNombre(pastelera.nombre);
        }}
        className="h-9 w-36"
        aria-label="Nombre"
      />
      <select
        value={pastelera.area_id}
        onChange={(e) => guardar({ area_id: Number(e.target.value) })}
        className="h-9 rounded-md border bg-background px-2 text-sm"
        aria-label={`Área de ${pastelera.nombre}`}
      >
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={pastelera.activa}
          onChange={(e) => guardar({ activa: e.target.checked })}
          className="size-4"
        />
        Activa
      </label>
    </li>
  );
}

function FormAgregar({
  areaId,
  porcentajeSugerido,
  onAgregar,
  ocupado,
}: {
  areaId: number;
  porcentajeSugerido: number;
  onAgregar: (v: { nombre: string; area_id: number; porcentaje: number }) => void;
  ocupado: boolean;
}) {
  const [nombre, setNombre] = useState("");
  return (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const limpio = nombre.trim();
        if (!limpio) return;
        onAgregar({ nombre: limpio, area_id: areaId, porcentaje: porcentajeSugerido });
        setNombre("");
      }}
    >
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nueva pastelera"
        className="h-9 flex-1"
        aria-label="Nombre de la nueva pastelera"
      />
      <Button type="submit" size="sm" variant="outline" disabled={ocupado || !nombre.trim()}>
        Agregar
      </Button>
    </form>
  );
}

