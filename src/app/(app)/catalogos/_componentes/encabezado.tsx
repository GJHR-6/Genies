import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECCIONES, type ClaveSeccion } from "./secciones";

/**
 * Encabezado de cada pantalla de catálogo: título con su ícono y una fila de
 * botones para saltar directo a cualquier otro catálogo (sin orden fijo).
 */
export function EncabezadoCatalogo({
  actual,
  children,
}: {
  actual: ClaveSeccion;
  /** Acciones a la derecha del título (p. ej. botón "Nuevo"). */
  children?: React.ReactNode;
}) {
  const seccion = SECCIONES.find((s) => s.clave === actual)!;
  const Icono = seccion.icono;

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Catálogos"
        className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <Link
          href="/catalogos"
          className="flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Catálogos
        </Link>
        {SECCIONES.map((s) => {
          const IconoBoton = s.icono;
          const activa = s.clave === actual;
          return (
            <Link
              key={s.clave}
              href={s.href}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              seccion.color
            )}
          >
            <Icono className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{seccion.titulo}</h1>
            <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
