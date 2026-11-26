"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Pantallas que usan todo el ancho (26 nov 2026): el cuadro completo es
 * muy ancho y la clienta lo quiere ver entero, sin mover de lado.
 */
const ANCHO_COMPLETO = ["/cuadros", "/historial"];

export function usaAnchoCompleto(ruta: string): boolean {
  return ANCHO_COMPLETO.some((r) => ruta === r || ruta.startsWith(`${r}/`));
}

/** Contenedor centrado de la página; en las pantallas anchas, sin tope. */
export function AnchoPagina({
  como: Elemento = "div",
  className,
  children,
}: {
  como?: "div" | "main";
  className?: string;
  children: React.ReactNode;
}) {
  const ancho = usaAnchoCompleto(usePathname());
  return (
    <Elemento
      className={cn(
        "mx-auto w-full",
        ancho ? "max-w-none" : "max-w-5xl",
        className,
        // Menos margen a los lados para que el cuadro entre entero.
        ancho && "px-2"
      )}
    >
      {children}
    </Elemento>
  );
}
