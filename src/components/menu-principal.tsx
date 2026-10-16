"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardPen,
  CookingPot,
  History,
  House,
  RotateCcw,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RolUsuario } from "@/lib/roles";

type Item = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Rutas que también marcan este botón como activo. */
  incluye?: string[];
};

const MENU: Record<RolUsuario, Item[]> = {
  admin: [
    {
      href: "/hoy",
      etiqueta: "Hoy",
      icono: House,
      incluye: ["/dashboard", "/sugeridos", "/cuadros", "/asignar"],
    },
    {
      href: "/catalogos",
      etiqueta: "Catálogos",
      icono: Settings2,
      incluye: ["/pasteleras"],
    },
    { href: "/rotacion", etiqueta: "Rotación", icono: RotateCcw },
    { href: "/historial", etiqueta: "Historial", icono: History },
  ],
  principal: [
    { href: "/captura", etiqueta: "Inventario", icono: ClipboardPen },
    { href: "/cocina", etiqueta: "Cocina", icono: CookingPot },
    { href: "/rotacion", etiqueta: "Rotación", icono: RotateCcw },
    { href: "/historial", etiqueta: "Historial", icono: History },
  ],
  tienda: [
    { href: "/captura", etiqueta: "Inventario", icono: ClipboardPen },
    { href: "/rotacion", etiqueta: "Rotación", icono: RotateCcw },
    { href: "/historial", etiqueta: "Historial", icono: History },
  ],
};

const coincide = (pathname: string, ruta: string) =>
  pathname === ruta || pathname.startsWith(`${ruta}/`);

/** Menú del encabezado: pocos botones grandes, con ícono y el actual marcado. */
export function MenuPrincipal({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menú principal"
      className="grid auto-cols-fr grid-flow-col gap-1 sm:flex sm:items-center"
    >
      {MENU[rol].map((item) => {
        const Icono = item.icono;
        const activo = [item.href, ...(item.incluye ?? [])].some((r) =>
          coincide(pathname, r)
        );
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              // Celular: pestañas del mismo ancho, ícono arriba del texto.
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs font-medium transition-colors sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm",
              activo
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icono className="size-5 sm:size-4" />
            {item.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
