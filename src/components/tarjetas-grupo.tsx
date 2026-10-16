import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Seccion } from "@/components/encabezado-seccion";

export type EstadoTarjeta = {
  /** Texto corto del estado, p. ej. "5 de 6 tiendas cerraron". */
  texto: string;
  tono?: "neutro" | "exito" | "aviso";
};

const TONO: Record<NonNullable<EstadoTarjeta["tono"]>, string> = {
  neutro: "bg-muted text-muted-foreground",
  exito: "bg-exito/10 text-exito",
  aviso: "bg-aviso/10 text-aviso",
};

/**
 * Portada de un grupo: una tarjeta grande por pantalla. Todas se abren en
 * cualquier momento; `destacada` solo resalta la que conviene mirar ahora.
 */
export function TarjetasGrupo({
  secciones,
  estados,
  destacada,
}: {
  secciones: readonly Seccion[];
  estados?: Partial<Record<string, EstadoTarjeta>>;
  destacada?: string | null;
}) {
  return (
    <div className="grid gap-x-4 gap-y-6 pt-3 sm:grid-cols-2 lg:grid-cols-3">
      {secciones.map((s) => {
        const Icono = s.icono;
        const estado = estados?.[s.clave];
        const resaltar = destacada === s.clave;
        return (
          <Link
            key={s.clave}
            href={s.href}
            className={cn(
              "group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              resaltar && "border-primary ring-2 ring-primary/30"
            )}
          >
            {resaltar && (
              <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Sigue aquí
              </span>
            )}
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                  s.color
                )}
              >
                <Icono className="size-7" />
              </span>
              {s.paso !== undefined && (
                <span
                  className="flex size-7 items-center justify-center rounded-full border text-xs font-bold text-muted-foreground"
                  title="Orden habitual del día"
                >
                  {s.paso}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{s.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.descripcion}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              {estado ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    TONO[estado.tono ?? "neutro"]
                  )}
                >
                  {estado.texto}
                </span>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                Abrir
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
