import { redirect } from "next/navigation";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { rutaInicio } from "@/lib/roles";
import { cerrarSesion } from "@/lib/acciones/auth";

export default async function Home() {
  const perfil = await obtenerPerfil();

  // Sin sesión el middleware ya redirige a /login; si hay sesión pero
  // no hay fila en `perfiles`, el usuario aún no fue dado de alta.
  if (!perfil) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Genies</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu usuario no tiene un perfil asignado. Contactá a la administración
          para que te asigne rol y sucursal.
        </p>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  redirect(rutaInicio(perfil.rol));
}
