import Link from "next/link";
import { CalendarDays } from "lucide-react";

/**
 * Elegir qué día ver o imprimir (Cuadros, hojas de despacho). Formulario
 * GET sin JavaScript: cambia ?fecha= y conserva los demás parámetros.
 */
export function ElegirDia({
  fecha,
  hoy,
  ruta,
  conservar = {},
}: {
  fecha: string;
  hoy: string;
  ruta: string;
  conservar?: Record<string, string>;
}) {
  return (
    <form method="get" action={ruta} className="flex flex-wrap items-center gap-2 print:hidden">
      {Object.entries(conservar).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="flex items-center gap-2 text-sm font-medium">
        <CalendarDays className="size-4 text-muted-foreground" />
        Día
        <input
          type="date"
          name="fecha"
          defaultValue={fecha}
          max={hoy}
          className="h-10 rounded-md border bg-background px-2 text-sm"
        />
      </label>
      <button type="submit" className="h-10 rounded-md border px-3 text-sm font-medium hover:bg-accent">
        Ver
      </button>
      {fecha !== hoy && (
        <Link
          href={`${ruta}${Object.keys(conservar).length ? `?${new URLSearchParams(conservar)}` : ""}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Volver a hoy
        </Link>
      )}
    </form>
  );
}
