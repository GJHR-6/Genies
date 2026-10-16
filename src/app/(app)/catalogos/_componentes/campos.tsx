"use client";

import { useState, useTransition } from "react";
import { CircleAlert, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { Resultado } from "@/lib/acciones/catalogos";

/** Etiqueta + control + ayuda opcional. */
export function Campo({
  etiqueta,
  ayuda,
  htmlFor,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

/** <select> nativo con el estilo de los inputs (funciona bien en celular). */
export function Selector({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

/** Interruptor sí/no con texto, más claro que un checkbox. */
export function Interruptor({
  activo,
  onCambio,
  etiqueta,
  descripcion,
}: {
  activo: boolean;
  onCambio: (valor: boolean) => void;
  etiqueta: string;
  descripcion?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-left hover:bg-accent/50"
    >
      <span>
        <span className="block text-sm font-medium">{etiqueta}</span>
        {descripcion && (
          <span className="block text-xs text-muted-foreground">
            {descripcion}
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          activo ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
            activo ? "left-[1.375rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function AvisoError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      {mensaje}
    </p>
  );
}

export function Buscador({
  valor,
  onCambio,
  placeholder,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className="h-10 bg-card pl-9"
      />
    </div>
  );
}

/** Pastilla de estado: Activo / Inactivo. */
export function EstadoActivo({ activo }: { activo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        activo
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-muted text-muted-foreground"
      )}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

/**
 * Ejecuta una Server Action de catálogo y expone estado de envío y error.
 * `alTerminar` se llama solo si la acción salió bien.
 */
export function useAccion() {
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<Resultado>, alTerminar?: () => void) {
    setError(null);
    iniciar(async () => {
      try {
        const r = await accion();
        if (r.ok) alTerminar?.();
        else setError(r.error);
      } catch {
        setError("No se pudo guardar. Revisá la conexión e intentá de nuevo.");
      }
    });
  }

  return { enviando, error, setError, ejecutar };
}

/** Convierte el texto de un input numérico a número o null si está vacío. */
export function numeroONull(texto: string): number | null {
  const t = texto.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}
