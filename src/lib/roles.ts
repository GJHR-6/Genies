import type { Enums } from "@/lib/types";

export type RolUsuario = Enums<"rol_usuario">;

/** Rutas que exigen rol admin (además del RLS en la base de datos). */
export const RUTAS_ADMIN = [
  "/dashboard",
  "/sugeridos",
  "/cuadros",
  "/catalogos",
] as const;

/** Pantalla inicial según el rol del perfil. */
export function rutaInicio(rol: RolUsuario): string {
  return rol === "admin" ? "/dashboard" : "/captura";
}

export function esRutaAdmin(pathname: string): boolean {
  return RUTAS_ADMIN.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}
