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
      className="-mx-1 flex items-center gap-1 overflow-x-auto px-1"
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
              "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              activo
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icono className="size-4" />
            {item.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
