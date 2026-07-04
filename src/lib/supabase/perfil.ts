import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/roles";

export type Perfil = {
  userId: string;
  email: string | null;
  nombre: string | null;
  rol: RolUsuario;
  sucursalId: number | null;
  sucursalNombre: string | null;
};

/**
 * Perfil del usuario autenticado (rol + sucursal), cacheado por request.
 * Devuelve null si no hay sesión o si el usuario no tiene fila en `perfiles`.
 */
export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("nombre, rol, sucursal_id, sucursales(nombre)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    nombre: data.nombre,
    rol: data.rol,
    sucursalId: data.sucursal_id,
    sucursalNombre: data.sucursales?.nombre ?? null,
  };
});
