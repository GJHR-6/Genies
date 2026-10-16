import { createClient } from "@/lib/supabase/server";
import { hayLlaveAdmin } from "@/lib/supabase/admin";
import { obtenerPerfil } from "@/lib/supabase/perfil";
import { UsuariosCliente } from "./usuarios-cliente";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const perfil = await obtenerPerfil();

  const [usuarios, sucursales] = await Promise.all([
    supabase.rpc("admin_usuarios"),
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("activa", true)
      .order("id"),
  ]);

  return (
    <section className="flex flex-col gap-5 py-2">
      <UsuariosCliente
        usuarios={usuarios.data ?? []}
        sucursales={sucursales.data ?? []}
        miUserId={perfil?.userId ?? ""}
        puedeAdministrarCuentas={hayLlaveAdmin()}
      />
    </section>
  );
}
