import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Cliente con la service key, SOLO para Server Actions que administran
 * usuarios de Auth (crear, cambiar contraseña). Nunca importarlo desde un
 * componente cliente: la variable no lleva prefijo NEXT_PUBLIC_ y no viaja
 * al navegador. Devuelve null si no está configurada.
 */
export function createAdminClient() {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!llave) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hayLlaveAdmin(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
