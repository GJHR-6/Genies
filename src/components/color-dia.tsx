import { colorDelDia } from "@/lib/color-dia";

/**
 * Distintivo del color del día. Con este color se marcan los pasteles
 * producidos en la fecha dada; no se muestra en domingo (sin producción).
 */
export function ChipColorDia({
  fecha,
  conEtiqueta = false,
  className = "",
}: {
  fecha: string;
  /** Antepone "Color del día:" (para cuadros e impresión). */
  conEtiqueta?: boolean;
  className?: string;
}) {
  const color = colorDelDia(fecha);
  if (!color) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {conEtiqueta && (
        <span className="text-xs font-medium text-muted-foreground print:text-black">
          Color del día:
        </span>
      )}
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
        style={{
          backgroundColor: color.fondo,
          color: color.texto,
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
        title={`Los pasteles producidos hoy se marcan con color ${color.nombre.toLowerCase()}`}
      >
        {color.nombre}
      </span>
    </span>
  );
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Aviso grande del color de hoy, para que la tienda lo vea apenas entra
 * (21 oct 2026): con este color van marcados los pasteles de hoy.
 */
export function AvisoColorDia({
  fecha,
  className = "",
}: {
  fecha: string;
  className?: string;
}) {
  const color = colorDelDia(fecha);
  if (!color) return null;
  const dia = DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm ${className}`}
      style={{
        backgroundColor: color.fondo,
        color: color.texto,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
      role="status"
    >
      <span
        aria-hidden
        className="size-9 shrink-0 rounded-full border-2"
        style={{ borderColor: color.texto }}
      />
      <div className="leading-tight">
        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
          Color de hoy · {dia}
        </p>
        <p className="text-2xl font-extrabold uppercase">{color.nombre}</p>
        <p className="text-xs opacity-90">
          Los pasteles de hoy van marcados en {color.nombre.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}
