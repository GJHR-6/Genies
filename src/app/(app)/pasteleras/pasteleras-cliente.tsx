"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
import {
  COLUMNAS_PASTELERA,
  aPastelera,
  type AreaDia,
  type PasteleraDia,
} from "@/lib/asignaciones";
import { repartirEntero, sumaPorcentajesPorArea } from "@/lib/reparto";

type Props = { areas: AreaDia[]; pastelerasIniciales: PasteleraDia[] };

type Cambios = Partial<Pick<PasteleraDia, "nombre" | "porcentaje" | "activa" | "area_id" | "orden">>;

export function PastelerasCliente({ areas, pastelerasIniciales }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [pasteleras, setPasteleras] = useState(pastelerasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pinDe, setPinDe] = useState<PasteleraDia | null>(null);

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

  const sumas = sumaPorcentajesPorArea(pasteleras);

  const repartirParejo = async (areaId: number) => {
    const activas = pasteleras
      .filter((p) => p.area_id === areaId && p.activa)
      .sort((a, b) => a.orden - b.orden || a.id - b.id);
    if (activas.length === 0) return;
    // Porcentajes enteros que suman exactamente 100.
    const partes = repartirEntero(
      100,
      activas.map((p) => ({ id: p.id, porcentaje: 1 }))
    );
    for (const p of activas) {
      const porcentaje = partes.get(p.id) ?? 0;
      if (porcentaje !== p.porcentaje) {
        await actualizar.mutateAsync({ id: p.id, cambios: { porcentaje } });
      }
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Pasteleras</h1>
          <p className="text-sm text-muted-foreground">
            Cada área reparte su producción entre sus pasteleras con un
            porcentaje fijo. Los porcentajes de las activas deben sumar 100 %.
          </p>
        </div>
        <Link
          href="/asignar"
          className="text-sm font-medium text-[#1F4E79] underline-offset-4 hover:underline"
        >
          Ir al reparto →
        </Link>
      </div>

      {error && (
        <p role="status" className="rounded-md bg-[#B3261E]/10 px-3 py-2 text-sm font-medium text-[#B3261E]">
          {error}
        </p>
      )}
      {ok && !error && (
        <p role="status" className="rounded-md bg-[#2E7D32]/10 px-3 py-2 text-sm font-medium text-[#2E7D32]">
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
            const suma = sumas.get(area.id) ?? 0;
            const cuadra = Math.abs(suma - 100) < 0.01;
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        lista.some((p) => p.activa)
                          ? cuadra
                            ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                            : "bg-[#B45309]/10 text-[#B45309]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Suma {suma} %
                    </span>
                    {lista.filter((p) => p.activa).length > 1 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => void repartirParejo(area.id)}
                        disabled={actualizar.isPending}
                      >
                        Repartir parejo
                      </Button>
                    )}
                  </div>
                </header>

                <ul className="flex flex-col gap-2">
                  {lista.map((p) => (
                    <FilaPastelera
                      key={p.id}
                      pastelera={p}
                      areas={areas}
                      guardar={(cambios) => actualizar.mutate({ id: p.id, cambios })}
                      onPin={() => setPinDe(p)}
                    />
                  ))}
                  {lista.length === 0 && (
                    <li className="text-sm text-muted-foreground">Sin pasteleras.</li>
                  )}
                </ul>

                <FormAgregar
                  areaId={area.id}
                  porcentajeSugerido={Math.max(0, 100 - suma)}
                  onAgregar={(vars) => agregar.mutate(vars)}
                  ocupado={agregar.isPending}
                />
              </article>
            );
          })}
      </div>

      <DialogoPin
        pastelera={pinDe}
        onCerrar={() => setPinDe(null)}
        onGuardado={(id, requiere) => {
          setPasteleras((prev) => prev.map((x) => (x.id === id ? { ...x, requiere_pin: requiere } : x)));
          setOk(requiere ? "PIN guardado." : "PIN quitado.");
          setError(null);
        }}
      />
    </section>
  );
}

function FilaPastelera({
  pastelera,
  areas,
  guardar,
  onPin,
}: {
  pastelera: PasteleraDia;
  areas: AreaDia[];
  guardar: (c: Cambios) => void;
  onPin: () => void;
}) {
  const [nombre, setNombre] = useState(pastelera.nombre);
  const [porcentaje, setPorcentaje] = useState(String(pastelera.porcentaje));

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
      <div className="flex items-center gap-1">
        <Input
          inputMode="decimal"
          value={porcentaje}
          onChange={(e) => setPorcentaje(e.target.value.replace(/[^\d.]/g, "").slice(0, 6))}
          onBlur={() => {
            const n = Number(porcentaje);
            if (porcentaje !== "" && Number.isFinite(n) && n >= 0 && n <= 100 && n !== pastelera.porcentaje) {
              guardar({ porcentaje: Math.round(n * 100) / 100 });
            } else setPorcentaje(String(pastelera.porcentaje));
          }}
          className="h-9 w-20 text-right tabular-nums"
          aria-label={`Porcentaje de ${pastelera.nombre}`}
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
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
      <Button size="sm" variant="outline" onClick={onPin} className="ml-auto">
        {pastelera.requiere_pin ? "Cambiar PIN" : "Poner PIN"}
      </Button>
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

function DialogoPin({
  pastelera,
  onCerrar,
  onGuardado,
}: {
  pastelera: PasteleraDia | null;
  onCerrar: () => void;
  onGuardado: (id: number, requiere: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (valor: string) => {
    if (!pastelera) return;
    setGuardando(true);
    const { error: err } = await supabase.rpc("fijar_pin_pastelera", {
      p_pastelera: pastelera.id,
      p_pin: valor,
    });
    setGuardando(false);
    if (err) {
      setError(err.message.includes("4 dígitos") ? "El PIN debe tener 4 números." : "No se pudo guardar.");
      return;
    }
    onGuardado(pastelera.id, valor !== "");
    setPin("");
    setError(null);
    onCerrar();
  };

  return (
    <Dialog
      open={pastelera !== null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setPin("");
          setError(null);
          onCerrar();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>PIN de {pastelera?.nombre}</DialogTitle>
          <DialogDescription>
            4 números que la pastelera escribe en la tablet de cocina para ver
            y marcar su trabajo. Sin PIN, cualquiera puede entrar con su nombre.
          </DialogDescription>
        </DialogHeader>
        <Input
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className="h-12 text-center text-2xl tracking-[0.5em]"
          aria-label="Nuevo PIN"
        />
        {error && <p className="text-sm text-[#B3261E]">{error}</p>}
        <DialogFooter className="gap-2">
          {pastelera?.requiere_pin && (
            <Button variant="outline" disabled={guardando} onClick={() => void guardar("")}>
              Quitar PIN
            </Button>
          )}
          <Button
            className="bg-[#1F4E79] hover:bg-[#1F4E79]/90"
            disabled={guardando || pin.length !== 4}
            onClick={() => void guardar(pin)}
          >
            {guardando ? "Guardando…" : "Guardar PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
