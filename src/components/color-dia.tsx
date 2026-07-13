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
