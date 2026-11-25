import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Una pantalla dentro de un grupo (Hoy, Catálogos): se abre desde un botón. */
export type Seccion = {
  clave: string;
  href: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  /** Clases de fondo + texto del ícono. */
  color: string;
  /** Orden sugerido (solo informativo: todas se pueden abrir en cualquier momento). */
  paso?: number;
};

export type Grupo = {
  /** Portada del grupo (menú de tarjetas). */
  inicio: { href: string; etiqueta: string };
  secciones: readonly Seccion[];
};

/**
 * Encabezado común: fila de botones para saltar a cualquier pantalla del
 * grupo (sin orden obligatorio), ícono grande, título y una línea que
 * explica para qué sirve la pantalla.
 */
export function EncabezadoSeccion({
  grupo,
  actual,
  children,
  detalle,
}: {
  grupo: Grupo;
  actual: string;
  /** Botones de acción a la derecha del título. */
  children?: React.ReactNode;
  /** Información extra bajo la descripción (fecha, color del día…). */
  detalle?: React.ReactNode;
}) {
  const seccion = grupo.secciones.find((s) => s.clave === actual)!;
  const Icono = seccion.icono;

  return (
    <div className="flex flex-col gap-4 print:hidden">
      <BotonesGrupo grupo={grupo} actual={actual} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              seccion.color
            )}
          >
            <Icono className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold">{seccion.titulo}</h1>
            <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
            {detalle && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {detalle}
              </div>
            )}
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}

/** Fila de botones: volver a la portada + cada pantalla del grupo. */
export function BotonesGrupo({ grupo, actual }: { grupo: Grupo; actual?: string }) {
  return (
    <nav
      aria-label={grupo.inicio.etiqueta}
      className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 print:hidden"
    >
      <Link
        href={grupo.inicio.href}
        className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {grupo.inicio.etiqueta}
      </Link>
      {grupo.secciones.map((s) => {
        const IconoBoton = s.icono;
        const activa = s.clave === actual;
        return (
          <Link
            key={s.clave}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              activa
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:border-primary/40 hover:bg-accent"
            )}
          >
            <IconoBoton className="size-4" />
            {s.titulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** Aviso con ícono, en lenguaje simple. */
export function Aviso({
  tipo,
  children,
  className,
}: {
  tipo: "info" | "aviso" | "exito" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const estilo = {
    info: "border-border bg-muted/50 text-foreground",
    aviso: "border-aviso/30 bg-aviso/10 text-aviso",
    exito: "border-exito/30 bg-exito/10 text-exito",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
  }[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm font-medium", estilo, className)}
    >
      {children}
    </div>
  );
}
